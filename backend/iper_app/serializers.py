from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Utilisateur, Contribuable, AgentDGI, Declaration, Paiement
import uuid


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['login'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Identifiants incorrects.")
        if not user.is_active:
            raise serializers.ValidationError("Ce compte est désactivé.")
        data['user'] = user
        return data


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'login', 'role', 'date_creation']


class ContribuableSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'inscription d'un nouveau contribuable."""
    login = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Contribuable
        fields = [
            'id_contribuable', 'raison_sociale', 'nif', 'adresse_physique',
            'telephone', 'email', 'date_inscription', 'login', 'password'
        ]
        read_only_fields = ['id_contribuable', 'date_inscription', 'nif']

    def validate_login(self, value):
        if Utilisateur.objects.filter(login=value).exists():
            raise serializers.ValidationError("Ce login est déjà utilisé.")
        return value

    def create(self, validated_data):
        import random
        import string
        # Générer un NIF automatique unique (Format: Lettre + 7 chiffres + Lettre)
        while True:
            digits = "".join(random.choices(string.digits, k=7))
            prefix = random.choice(string.ascii_uppercase)
            suffix = random.choice(string.ascii_uppercase)
            nif_candidate = f"{prefix}{digits}{suffix}"
            if not Contribuable.objects.filter(nif=nif_candidate).exists():
                nif = nif_candidate
                break

        login = validated_data.pop('login')
        password = validated_data.pop('password')
        user = Utilisateur.objects.create_user(
            login=login, password=password, role='CONTRIBUABLE'
        )
        return Contribuable.objects.create(utilisateur=user, nif=nif, **validated_data)


class ContribuableDetailSerializer(serializers.ModelSerializer):
    login = serializers.CharField(source='utilisateur.login', read_only=True)
    nb_declarations = serializers.SerializerMethodField()

    class Meta:
        model = Contribuable
        fields = [
            'id_contribuable', 'raison_sociale', 'nif', 'adresse_physique',
            'telephone', 'email', 'date_inscription', 'login', 'nb_declarations'
        ]

    def get_nb_declarations(self, obj):
        return obj.declarations.count()


class AgentDGISerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentDGI
        fields = ['id_agent', 'matricule', 'nom_complet', 'fonction']


class DeclarationSerializer(serializers.ModelSerializer):
    contribuable_nom = serializers.CharField(
        source='contribuable.raison_sociale', read_only=True
    )
    contribuable_nif = serializers.CharField(
        source='contribuable.nif', read_only=True
    )
    agent_nom = serializers.SerializerMethodField()
    montant_total = serializers.SerializerMethodField()

    class Meta:
        model = Declaration
        fields = [
            'id_declaration', 'contribuable', 'contribuable_nom', 'contribuable_nif',
            'agent_validateur', 'agent_nom', 'mois_fiscal', 'annee_fiscale',
            'base_imposable', 'taux_iper', 'montant_iper', 'penalite_retard',
            'montant_total', 'statut', 'motif_rejet', 'date_soumission', 'date_validation'
        ]
        read_only_fields = [
            'montant_iper', 'penalite_retard', 'date_validation',
            'agent_validateur', 'date_soumission'
        ]

    def get_agent_nom(self, obj):
        if obj.agent_validateur:
            return obj.agent_validateur.nom_complet
        return None

    def get_montant_total(self, obj):
        return float(obj.montant_iper) + float(obj.penalite_retard)


class DeclarationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Declaration
        fields = ['mois_fiscal', 'annee_fiscale', 'base_imposable']

    def validate_base_imposable(self, value):
        if value <= 0:
            raise serializers.ValidationError("La base imposable doit être supérieure à 0.")
        return value

    def validate(self, data):
        contribuable = self.context['contribuable']
        if Declaration.objects.filter(
            contribuable=contribuable,
            mois_fiscal=data['mois_fiscal'],
            annee_fiscale=data['annee_fiscale']
        ).exists():
            raise serializers.ValidationError(
                "Une déclaration existe déjà pour ce mois et cette année fiscale."
            )
        return data

    def create(self, validated_data):
        contribuable = self.context['contribuable']
        return Declaration.objects.create(contribuable=contribuable, **validated_data)


class PaiementSerializer(serializers.ModelSerializer):
    declaration_info = DeclarationSerializer(source='declaration', read_only=True)

    class Meta:
        model = Paiement
        fields = [
            'id_paiement', 'declaration', 'declaration_info',
            'date_transaction', 'montant_paye', 'mode_paiement',
            'reference_quittance', 'banque', 'observations'
        ]
        read_only_fields = ['reference_quittance']

    def validate_declaration(self, value):
        if value.statut != 'VALIDE':
            raise serializers.ValidationError(
                "Seules les déclarations validées peuvent être apurées."
            )
        if hasattr(value, 'paiement'):
            raise serializers.ValidationError(
                "Un paiement existe déjà pour cette déclaration."
            )
        return value

    def create(self, validated_data):
        validated_data['reference_quittance'] = f"DGI-MBZ-{uuid.uuid4().hex[:8].upper()}"
        return super().create(validated_data)
