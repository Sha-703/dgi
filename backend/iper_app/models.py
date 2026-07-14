from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone
from datetime import datetime
from decimal import Decimal
from datetime import timezone as dt_timezone


class UtilisateurManager(BaseUserManager):
    def create_user(self, login, password=None, role='CONTRIBUABLE'):
        if not login:
            raise ValueError("Le login est obligatoire")
        user = self.model(login=login, role=role)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login, password):
        user = self.create_user(login, password, role='ADMIN')
        user.is_staff = True
        user.save(using=self._db)
        return user


class Utilisateur(AbstractBaseUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('AGENT', 'Agent DGI'),
        ('CONTRIBUABLE', 'Contribuable'),
    ]
    login = models.CharField(max_length=100, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CONTRIBUABLE')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_creation = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'login'
    REQUIRED_FIELDS = []
    objects = UtilisateurManager()

    class Meta:
        db_table = 'T_Utilisateur'

    def __str__(self):
        return f"{self.login} ({self.role})"

    def has_perm(self, perm, obj=None):
        return self.is_staff

    def has_module_perms(self, app_label):
        return self.is_staff


class Contribuable(models.Model):
    id_contribuable = models.AutoField(primary_key=True)
    raison_sociale = models.CharField(max_length=255)
    nif = models.CharField(
        max_length=50, unique=True,
        verbose_name="Numéro d'Identification Fiscale"
    )
    adresse_physique = models.TextField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    utilisateur = models.OneToOneField(
        Utilisateur, on_delete=models.CASCADE, related_name='contribuable'
    )
    date_inscription = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'T_Contribuable'

    def __str__(self):
        return f"{self.raison_sociale} - NIF: {self.nif}"


class AgentDGI(models.Model):
    id_agent = models.AutoField(primary_key=True)
    matricule = models.CharField(max_length=50, unique=True)
    nom_complet = models.CharField(max_length=255)
    fonction = models.CharField(max_length=100, blank=True)
    utilisateur = models.OneToOneField(
        Utilisateur, on_delete=models.CASCADE, related_name='agent'
    )

    class Meta:
        db_table = 'T_Agent_DGI'

    def __str__(self):
        return f"{self.nom_complet} - {self.matricule}"


class Declaration(models.Model):
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente de validation'),
        ('VALIDE', 'Validée'),
        ('REJETE', 'Rejetée'),
        ('GELE', 'Gelée'),
    ]
    MOIS_CHOICES = [(i, f"{i:02d}") for i in range(1, 13)]

    id_declaration = models.AutoField(primary_key=True)
    contribuable = models.ForeignKey(
        Contribuable, on_delete=models.PROTECT, related_name='declarations'
    )
    agent_validateur = models.ForeignKey(
        AgentDGI, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='declarations_validees'
    )
    mois_fiscal = models.IntegerField(choices=MOIS_CHOICES)
    annee_fiscale = models.IntegerField()
    base_imposable = models.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="Total des rémunérations brutes en CDF"
    )
    taux_iper = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('15.00'),
        help_text="Taux IPER en %"
    )
    montant_iper = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00')
    )
    penalite_retard = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00')
    )
    statut = models.CharField(
        max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE'
    )
    motif_rejet = models.TextField(blank=True)
    date_soumission = models.DateTimeField(default=timezone.now)
    date_validation = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'T_Declaration'
        unique_together = ('contribuable', 'mois_fiscal', 'annee_fiscale')
        ordering = ['-date_soumission']

    def save(self, *args, **kwargs):
        # BUG CORRIGÉ: calcul IPER avec Decimal pour éviter erreurs de virgule flottante
        self.montant_iper = (self.base_imposable * self.taux_iper / Decimal('100')).quantize(Decimal('0.01'))

        # BUG CORRIGÉ: date_limite calculée correctement selon le mois
        if self.mois_fiscal == 12:
            annee_limite = self.annee_fiscale + 1
            mois_limite = 1
        else:
            annee_limite = self.annee_fiscale
            mois_limite = self.mois_fiscal + 1

        date_limite = datetime(annee_limite, mois_limite, 15, tzinfo=dt_timezone.utc)

        if timezone.now() > date_limite and self.penalite_retard == Decimal('0.00'):
            self.penalite_retard = (self.montant_iper * Decimal('0.10')).quantize(Decimal('0.01'))

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Déclaration {self.contribuable.nif} - {self.mois_fiscal:02d}/{self.annee_fiscale}"


class Paiement(models.Model):
    MODE_CHOICES = [
        ('VIREMENT', 'Virement bancaire'),
        ('ESPECES', 'Espèces'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('CHEQUE', 'Chèque'),
    ]
    id_paiement = models.AutoField(primary_key=True)
    declaration = models.OneToOneField(
        Declaration, on_delete=models.PROTECT, related_name='paiement'
    )
    date_transaction = models.DateTimeField(default=timezone.now)
    montant_paye = models.DecimalField(max_digits=15, decimal_places=2)
    mode_paiement = models.CharField(max_length=20, choices=MODE_CHOICES)
    reference_quittance = models.CharField(max_length=100, unique=True)
    banque = models.CharField(max_length=100, blank=True)
    observations = models.TextField(blank=True)

    class Meta:
        db_table = 'T_Paiement'

    def __str__(self):
        return f"Paiement {self.reference_quittance} - {self.montant_paye} CDF"
