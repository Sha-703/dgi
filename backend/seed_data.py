"""
Script de données initiales pour tester la plateforme DGI IPER.
Exécuter avec : python manage.py shell < seed_data.py
Ou : python seed_data.py (depuis le dossier dgi_project)
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from iper_app.models import Utilisateur, Contribuable, AgentDGI, Declaration, Paiement
from decimal import Decimal

print("🔄 Création des données initiales...")

# 1. Admin
if not Utilisateur.objects.filter(login='admin@dgi').exists():
    admin = Utilisateur.objects.create_superuser(login='admin@dgi', password='admin123')
    print("✅ Admin créé : admin@dgi / admin123")

# 2. Agent DGI
if not Utilisateur.objects.filter(login='agent@dgi').exists():
    agent_user = Utilisateur.objects.create_user(login='agent@dgi', password='agent123', role='AGENT')
    AgentDGI.objects.create(
        utilisateur=agent_user,
        matricule='DGI-0042',
        nom_complet='Dieudonné Ngoma',
        fonction='Contrôleur Fiscal'
    )
    print("✅ Agent créé : agent@dgi / agent123")

# 3. Contribuable 1
if not Contribuable.objects.filter(nif='A1234567B').exists():
    u1 = Utilisateur.objects.create_user(login='entreprise@sarl', password='sarl123', role='CONTRIBUABLE')
    c1 = Contribuable.objects.create(
        utilisateur=u1,
        raison_sociale='SARL KONGO TRADE',
        nif='A1234567B',
        adresse_physique='Avenue Lumumba N°12, Mbanza-Ngungu',
        telephone='+243 815 000 001',
        email='contact@kongotrade.cd'
    )
    # Déclarations
    Declaration.objects.get_or_create(
        contribuable=c1, mois_fiscal=4, annee_fiscale=2025,
        defaults={'base_imposable': Decimal('4500000.00'), 'statut': 'EN_ATTENTE'}
    )
    Declaration.objects.get_or_create(
        contribuable=c1, mois_fiscal=3, annee_fiscale=2025,
        defaults={'base_imposable': Decimal('4200000.00'), 'statut': 'REJETE', 'motif_rejet': 'Base imposable incohérente avec les bulletins de salaire fournis.'}
    )
    print("✅ Contribuable 1 créé : entreprise@sarl / sarl123")

# 4. Contribuable 2
if not Contribuable.objects.filter(nif='B9876543C').exists():
    u2 = Utilisateur.objects.create_user(login='mines@sprl', password='mines123', role='CONTRIBUABLE')
    c2 = Contribuable.objects.create(
        utilisateur=u2,
        raison_sociale='SPRL KONGO MINES',
        nif='B9876543C',
        adresse_physique='Quartier Industriel, Zone B, Mbanza-Ngungu',
        telephone='+243 815 000 002',
        email='info@kongomines.cd'
    )
    agent = AgentDGI.objects.first()
    d_valide, _ = Declaration.objects.get_or_create(
        contribuable=c2, mois_fiscal=3, annee_fiscale=2025,
        defaults={'base_imposable': Decimal('8200000.00'), 'statut': 'VALIDE', 'agent_validateur': agent}
    )
    Declaration.objects.get_or_create(
        contribuable=c2, mois_fiscal=4, annee_fiscale=2025,
        defaults={'base_imposable': Decimal('9100000.00'), 'statut': 'EN_ATTENTE'}
    )
    # Paiement pour la déclaration validée
    if not Paiement.objects.filter(declaration=d_valide).exists():
        Paiement.objects.create(
            declaration=d_valide,
            montant_paye=d_valide.montant_iper + d_valide.penalite_retard,
            mode_paiement='VIREMENT',
            reference_quittance='DGI-MBZ-A1B2C3D4',
            banque='Rawbank Mbanza-Ngungu'
        )
    print("✅ Contribuable 2 créé : mines@sprl / mines123")

print("\n🎉 Données initiales créées avec succès !")
print("\nComptes disponibles:")
print("  admin@dgi     / admin123    → Administrateur")
print("  agent@dgi     / agent123    → Agent DGI")
print("  entreprise@sarl / sarl123   → Contribuable (SARL KONGO TRADE)")
print("  mines@sprl    / mines123    → Contribuable (SPRL KONGO MINES)")
