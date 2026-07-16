"""
Script de données initiales pour tester la plateforme DGI IPER.
Exécuter avec : python manage.py shell < seed_data.py
Ou : python seed_data.py (depuis le dossier backend)
Idempotent : peut être relancé sans risque (re-seed automatique au déploiement).
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
    Utilisateur.objects.create_superuser(login='admin@dgi', password='admin123')
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

# 3. Contribuable 1 — utilisateur+contribuable créés UNE FOIS (idempotent),
#    puis les déclarations créées dans TOUS les cas (via get_or_create sur
#    la contrainte unique contribuable+mois+annee). Corrige le défaut
#    précédent où un re-seed n'ajoutait pas les déclarations d'un contribuable
#    déjà existant (cas d'un seed précédent interrompu).
c1 = Contribuable.objects.filter(nif='A1234567B').first()
if c1 is None:
    u1 = Utilisateur.objects.create_user(login='entreprise@sarl', password='sarl123', role='CONTRIBUABLE')
    c1 = Contribuable.objects.create(
        utilisateur=u1,
        raison_sociale='SARL KONGO TRADE',
        nif='A1234567B',
        adresse_physique='Avenue Lumumba N°12, Mbanza-Ngungu',
        telephone='+243 815 000 001',
        email='contact@kongotrade.cd'
    )
    print("✅ Contribuable 1 créé : entreprise@sarl / sarl123")
else:
    print("   Contribuable 1 déjà existant : entreprise@sarl / sarl123")
Declaration.objects.get_or_create(
    contribuable=c1, mois_fiscal=4, annee_fiscale=2025,
    defaults={'base_imposable': Decimal('4500000.00'), 'statut': 'EN_ATTENTE'}
)
Declaration.objects.get_or_create(
    contribuable=c1, mois_fiscal=3, annee_fiscale=2025,
    defaults={'base_imposable': Decimal('4200000.00'), 'statut': 'REJETE',
              'motif_rejet': 'Base imposable incohérente avec les bulletins de salaire fournis.'}
)

# 4. Contribuable 2 — même pattern idempotent
c2 = Contribuable.objects.filter(nif='B9876543C').first()
if c2 is None:
    u2 = Utilisateur.objects.create_user(login='mines@sprl', password='mines123', role='CONTRIBUABLE')
    c2 = Contribuable.objects.create(
        utilisateur=u2,
        raison_sociale='SPRL KONGO MINES',
        nif='B9876543C',
        adresse_physique='Quartier Industriel, Zone B, Mbanza-Ngungu',
        telephone='+243 815 000 002',
        email='info@kongomines.cd'
    )
    print("✅ Contribuable 2 créé : mines@sprl / mines123")
else:
    print("   Contribuable 2 déjà existant : mines@sprl / mines123")
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

print("\n🎉 Données initiales prêtes.")
print("\nComptes disponibles:")
print("  admin@dgi       / admin123    → Administrateur")
print("  agent@dgi       / agent123    → Agent DGI")
print("  entreprise@sarl / sarl123     → Contribuable (SARL KONGO TRADE)")
print("  mines@sprl      / mines123    → Contribuable (SPRL KONGO MINES)")
