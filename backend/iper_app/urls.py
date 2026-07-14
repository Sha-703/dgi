from django.urls import path
from . import views

urlpatterns = [
    # Authentification
    path('auth/login/',    views.login_view,  name='login'),
    path('auth/logout/',   views.logout_view, name='logout'),

    # Contribuables
    path('contribuables/register/',   views.ContribuableRegisterView.as_view(), name='contribuable-register'),
    path('contribuables/',            views.ContribuableListView.as_view(),     name='contribuable-list'),
    path('contribuables/mon-profil/', views.mon_profil_view,                    name='mon-profil'),

    # Déclarations
    path('declarations/',        views.declarations_view,        name='declarations'),
    path('declarations/<int:pk>/', views.declaration_detail_view, name='declaration-detail'),

    # Paiements
    path('paiements/', views.paiements_view, name='paiements'),

    # Statistiques
    path('statistiques/', views.statistiques_view, name='statistiques'),
]
