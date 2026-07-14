from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur, Contribuable, AgentDGI, Declaration, Paiement


@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ['login', 'role', 'is_active', 'date_creation']
    list_filter = ['role', 'is_active']
    search_fields = ['login']


@admin.register(Contribuable)
class ContribuableAdmin(admin.ModelAdmin):
    list_display = ['raison_sociale', 'nif', 'telephone', 'email', 'date_inscription']
    search_fields = ['raison_sociale', 'nif']


@admin.register(AgentDGI)
class AgentDGIAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'matricule', 'fonction']
    search_fields = ['nom_complet', 'matricule']


@admin.register(Declaration)
class DeclarationAdmin(admin.ModelAdmin):
    list_display = ['id_declaration', 'contribuable', 'mois_fiscal', 'annee_fiscale',
                    'base_imposable', 'montant_iper', 'statut', 'date_soumission']
    list_filter = ['statut', 'annee_fiscale', 'mois_fiscal']
    search_fields = ['contribuable__raison_sociale', 'contribuable__nif']
    readonly_fields = ['montant_iper', 'penalite_retard', 'date_soumission']


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['reference_quittance', 'declaration', 'montant_paye',
                    'mode_paiement', 'date_transaction']
    search_fields = ['reference_quittance']
