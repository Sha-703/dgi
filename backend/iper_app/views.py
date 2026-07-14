from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.db.models import Sum
from .models import Contribuable, AgentDGI, Declaration, Paiement
from .serializers import (
    LoginSerializer, ContribuableSerializer, ContribuableDetailSerializer,
    DeclarationSerializer, DeclarationCreateSerializer,
    PaiementSerializer,
)


# ─── PERMISSIONS ──────────────────────────────────────────────────

class IsAgentOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['AGENT', 'ADMIN']
        )


class IsContribuable(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CONTRIBUABLE'
        )


# ─── AUTHENTIFICATION ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    token, _ = Token.objects.get_or_create(user=user)
    profile = {}

    if user.role == 'CONTRIBUABLE':
        try:
            c = user.contribuable
            profile = {
                'id': c.id_contribuable,
                'nom': c.raison_sociale,
                'nif': c.nif,
                'adresse': c.adresse_physique,
            }
        except Contribuable.DoesNotExist:
            pass

    elif user.role in ['AGENT', 'ADMIN']:
        try:
            a = user.agent
            profile = {
                'id': a.id_agent,
                'nom': a.nom_complet,
                'matricule': a.matricule,
                'fonction': a.fonction,
            }
        except AgentDGI.DoesNotExist:
            # ADMIN sans profil AgentDGI — fournir profil minimal
            profile = {
                'id': None,
                'nom': user.login,
                'matricule': 'ADMIN',
                'fonction': 'Administrateur système',
            }

    return Response({
        'token': token.key,
        'role': user.role,
        'login': user.login,
        'profile': profile,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Déconnexion réussie.'})


# ─── CONTRIBUABLES ────────────────────────────────────────────────

class ContribuableRegisterView(generics.CreateAPIView):
    serializer_class = ContribuableSerializer
    permission_classes = [permissions.AllowAny]


class ContribuableListView(generics.ListAPIView):
    serializer_class = ContribuableDetailSerializer
    permission_classes = [IsAgentOrAdmin]
    queryset = Contribuable.objects.all().order_by('raison_sociale')


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def mon_profil_view(request):
    """Profil du contribuable connecté."""
    if request.user.role != 'CONTRIBUABLE':
        return Response(
            {'error': 'Accès réservé aux contribuables.'},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        contribuable = request.user.contribuable
    except Contribuable.DoesNotExist:
        return Response(
            {'error': 'Profil contribuable introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        return Response(ContribuableDetailSerializer(contribuable).data)

    serializer = ContribuableDetailSerializer(
        contribuable, data=request.data, partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── DÉCLARATIONS ─────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def declarations_view(request):
    if request.method == 'GET':
        if request.user.role == 'CONTRIBUABLE':
            try:
                qs = Declaration.objects.filter(contribuable=request.user.contribuable)
            except Contribuable.DoesNotExist:
                return Response([], status=status.HTTP_200_OK)
        else:
            qs = Declaration.objects.select_related(
                'contribuable', 'agent_validateur'
            ).all()

        statut = request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        annee = request.query_params.get('annee')
        if annee:
            qs = qs.filter(annee_fiscale=annee)

        return Response(DeclarationSerializer(qs, many=True).data)

    # POST — soumettre une déclaration
    if request.user.role != 'CONTRIBUABLE':
        return Response(
            {'error': 'Seul un contribuable peut soumettre une déclaration.'},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        contribuable = request.user.contribuable
    except Contribuable.DoesNotExist:
        return Response(
            {'error': 'Profil contribuable introuvable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = DeclarationCreateSerializer(
        data=request.data,
        context={'contribuable': contribuable}
    )
    if serializer.is_valid():
        declaration = serializer.save()
        return Response(
            DeclarationSerializer(declaration).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def declaration_detail_view(request, pk):
    try:
        if request.user.role == 'CONTRIBUABLE':
            declaration = Declaration.objects.get(
                pk=pk, contribuable=request.user.contribuable
            )
        else:
            declaration = Declaration.objects.get(pk=pk)
    except Declaration.DoesNotExist:
        return Response(
            {'error': 'Déclaration introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        return Response(DeclarationSerializer(declaration).data)

    # PATCH — valider / rejeter (agents seulement)
    if request.user.role not in ['AGENT', 'ADMIN']:
        return Response(
            {'error': 'Action non autorisée.'},
            status=status.HTTP_403_FORBIDDEN
        )

    nouveau_statut = request.data.get('statut')
    if nouveau_statut not in ['VALIDE', 'REJETE', 'GELE']:
        return Response(
            {'error': "Statut invalide. Valeurs acceptées : VALIDE, REJETE, GELE."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if nouveau_statut == 'REJETE':
        motif = request.data.get('motif_rejet', '').strip()
        if not motif:
            return Response(
                {'error': 'Un motif de rejet est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        declaration.motif_rejet = motif
    else:
        declaration.motif_rejet = ''

    declaration.statut = nouveau_statut
    declaration.date_validation = timezone.now()

    # BUG CORRIGÉ : l'ADMIN peut ne pas avoir de profil AgentDGI
    try:
        declaration.agent_validateur = request.user.agent
    except AgentDGI.DoesNotExist:
        pass  # Admin sans profil agent — on laisse null

    declaration.save()
    return Response(DeclarationSerializer(declaration).data)




@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def paiements_view(request):
    if request.method == 'GET':
        # Agents and admins see all payments; contributors see only their own
        if request.user.role in ['AGENT', 'ADMIN']:
            paiements = Paiement.objects.select_related(
                'declaration__contribuable'
            ).order_by('-date_transaction')
        else:
            # Contribuable – filter payments linked to their declarations
            try:
                contribuable = request.user.contribuable
                paiements = Paiement.objects.select_related(
                    'declaration__contribuable'
                ).filter(declaration__contribuable=contribuable).order_by('-date_transaction')
            except Contribuable.DoesNotExist:
                return Response([], status=status.HTTP_200_OK)
        return Response(PaiementSerializer(paiements, many=True).data)

    # Only agents or admins can create payments
    if request.user.role not in ['AGENT', 'ADMIN']:
        return Response({'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = PaiementSerializer(data=request.data)
    if serializer.is_valid():
        paiement = serializer.save()
        return Response(
            PaiementSerializer(paiement).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── STATISTIQUES ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAgentOrAdmin])
def statistiques_view(request):
    annee_param = request.query_params.get('annee')
    if annee_param not in (None, ''):
        try:
            annee = int(annee_param)
            declarations = Declaration.objects.filter(annee_fiscale=annee)
            paiements = Paiement.objects.filter(declaration__annee_fiscale=annee)
        except (ValueError, TypeError):
            # fallback to all years if conversion fails
            declarations = Declaration.objects.all()
            paiements = Paiement.objects.all()
            annee = None
    else:
        declarations = Declaration.objects.all()
        paiements = Paiement.objects.all()
        annee = None

    total_recouvre = paiements.aggregate(
        total=Sum('montant_paye')
    )['total'] or 0

    return Response({
        'annee': annee,
        'total_declarations': declarations.count(),
        'declarations_en_attente': declarations.filter(statut='EN_ATTENTE').count(),
        'declarations_validees': declarations.filter(statut='VALIDE').count(),
        'declarations_rejetees': declarations.filter(statut='REJETE').count(),
        'declarations_gelees': declarations.filter(statut='GELE').count(),
        'total_recouvre': float(total_recouvre),
        'nb_contribuables': Contribuable.objects.count(),
        'nb_agents': AgentDGI.objects.count(),
    })
