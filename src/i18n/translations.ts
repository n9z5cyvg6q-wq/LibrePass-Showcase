export type Locale = "en" | "fr" | "de" | "it";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

export const localeFlagEmoji: Record<Locale, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  it: "🇮🇹",
};

const translations = {
  // ── Common ──
  back: { en: "Back", fr: "Retour", de: "Zurück", it: "Indietro" },
  save: { en: "Save", fr: "Enregistrer", de: "Speichern", it: "Salva" },
  cancel: { en: "Cancel", fr: "Annuler", de: "Abbrechen", it: "Annulla" },
  close: { en: "Close", fr: "Fermer", de: "Schliessen", it: "Chiudi" },
  checkout: { en: "Checkout", fr: "Paiement", de: "Bezahlung", it: "Pagamento" },
  payNow: { en: "Pay Now", fr: "Payer maintenant", de: "Jetzt bezahlen", it: "Paga ora" },
  paymentMethod: { en: "Payment Method", fr: "Méthode de paiement", de: "Zahlungsmethode", it: "Metodo di pagamento" },
  processing: { en: "Processing…", fr: "Traitement…", de: "Verarbeitung…", it: "Elaborazione…" },
  redirectingToPermit: { en: "Redirecting…", fr: "Redirection…", de: "Weiterleitung…", it: "Reindirizzamento…" },
  general: { en: "General", fr: "Général", de: "Allgemein", it: "Generale" },
  predictiveData: { en: "Predictive Data", fr: "Données Prédictives", de: "Prognosedaten", it: "Dati Predittivi" },
  loading: { en: "Loading…", fr: "Chargement…", de: "Laden…", it: "Caricamento…" },
  enabled: { en: "Enabled", fr: "Activé", de: "Aktiviert", it: "Attivato" },
  disabled: { en: "Disabled", fr: "Désactivé", de: "Deaktiviert", it: "Disattivato" },
  delete: { en: "Delete", fr: "Supprimer", de: "Löschen", it: "Elimina" },
  search: { en: "Search", fr: "Rechercher", de: "Suchen", it: "Cerca" },
  language: { en: "Language", fr: "Langue", de: "Sprache", it: "Lingua" },

  // ── Loading screen ──
  smartParking: { en: "Smart Parking · Lausanne", fr: "Stationnement intelligent · Lausanne", de: "Intelligentes Parken · Lausanne", it: "Parcheggio intelligente · Losanna" },

  // ── Bottom nav ──
  navMap: { en: "Map", fr: "Carte", de: "Karte", it: "Mappa" },
  navPass: { en: "Pass", fr: "Pass", de: "Pass", it: "Pass" },
  navSearch: { en: "Search", fr: "Recherche", de: "Suche", it: "Ricerca" },
  navProfile: { en: "Profile", fr: "Profil", de: "Profil", it: "Profilo" },

  // ── Auth ──
  welcomeBack: { en: "Welcome back", fr: "Bon retour", de: "Willkommen zurück", it: "Bentornato" },
  createAccount: { en: "Create your account", fr: "Créez votre compte", de: "Konto erstellen", it: "Crea il tuo account" },
  signIn: { en: "Sign In", fr: "Connexion", de: "Anmelden", it: "Accedi" },
  signUp: { en: "Sign Up", fr: "Inscription", de: "Registrieren", it: "Registrati" },
  createAccountBtn: { en: "Create Account", fr: "Créer un compte", de: "Konto erstellen", it: "Crea account" },
  fullName: { en: "Full Name", fr: "Nom complet", de: "Vollständiger Name", it: "Nome completo" },
  licensePlateOptional: { en: "License Plate (optional)", fr: "Plaque d'immatriculation (optionnel)", de: "Nummernschild (optional)", it: "Targa (opzionale)" },
  email: { en: "Email", fr: "E-mail", de: "E-Mail", it: "E-mail" },
  password: { en: "Password", fr: "Mot de passe", de: "Passwort", it: "Password" },
  forgotPassword: { en: "Forgot password?", fr: "Mot de passe oublié ?", de: "Passwort vergessen?", it: "Password dimenticata?" },
  orContinueWith: { en: "or continue with", fr: "ou continuer avec", de: "oder weiter mit", it: "o continua con" },
  dontHaveAccount: { en: "Don't have an account?", fr: "Pas encore de compte ?", de: "Noch kein Konto?", it: "Non hai un account?" },
  alreadyHaveAccount: { en: "Already have an account?", fr: "Vous avez déjà un compte ?", de: "Bereits ein Konto?", it: "Hai già un account?" },
  signingInWith: { en: "Signing in with", fr: "Connexion avec", de: "Anmelden mit", it: "Accesso con" },
  checkEmailConfirm: { en: "Check your email to confirm your account!", fr: "Vérifiez votre e-mail pour confirmer votre compte !", de: "Überprüfen Sie Ihre E-Mail zur Kontobestätigung!", it: "Controlla la tua email per confermare l'account!" },
  signInTakingLong: { en: "Sign-in is taking too long. Please try again.", fr: "La connexion prend trop de temps. Réessayez.", de: "Die Anmeldung dauert zu lange. Bitte erneut versuchen.", it: "L'accesso sta richiedendo troppo tempo. Riprova." },
  enterEmailFirst: { en: "Enter your email first", fr: "Entrez d'abord votre e-mail", de: "Geben Sie zuerst Ihre E-Mail ein", it: "Inserisci prima la tua email" },
  resetLinkSent: { en: "Password reset link sent! Check your email.", fr: "Lien de réinitialisation envoyé ! Vérifiez votre e-mail.", de: "Link zum Zurücksetzen gesendet! Überprüfen Sie Ihre E-Mail.", it: "Link di reimpostazione inviato! Controlla la tua email." },
  failedResetLink: { en: "Failed to send reset link", fr: "Échec de l'envoi du lien", de: "Fehler beim Senden des Links", it: "Invio del link fallito" },

  // ── Reset password ──
  newPassword: { en: "New Password", fr: "Nouveau mot de passe", de: "Neues Passwort", it: "Nuova password" },
  enterNewPassword: { en: "Enter your new password below", fr: "Entrez votre nouveau mot de passe", de: "Geben Sie Ihr neues Passwort ein", it: "Inserisci la tua nuova password" },
  updatePassword: { en: "Update Password", fr: "Mettre à jour", de: "Passwort aktualisieren", it: "Aggiorna password" },
  passwordUpdated: { en: "Password updated successfully!", fr: "Mot de passe mis à jour !", de: "Passwort erfolgreich aktualisiert!", it: "Password aggiornata!" },
  verifyingLink: { en: "Verifying reset link…", fr: "Vérification du lien…", de: "Link wird überprüft…", it: "Verifica del link…" },

  // ── Map ──
  nearest: { en: "Nearest", fr: "Le plus proche", de: "Nächster", it: "Più vicino" },
  available: { en: "Available", fr: "Disponible", de: "Verfügbar", it: "Disponibile" },
  limited: { en: "Limited", fr: "Limité", de: "Begrenzt", it: "Limitato" },
  full: { en: "Full", fr: "Complet", de: "Voll", it: "Pieno" },
  updatingAvailability: { en: "Updating availability…", fr: "Mise à jour…", de: "Verfügbarkeit wird aktualisiert…", it: "Aggiornamento disponibilità…" },
  updated: { en: "Updated", fr: "Mis à jour", de: "Aktualisiert", it: "Aggiornato" },
  enableLocationNearest: { en: "Enable location to find nearest parking", fr: "Activez la localisation pour trouver le parking le plus proche", de: "Standort aktivieren für den nächsten Parkplatz", it: "Attiva la posizione per il parcheggio più vicino" },
  noAvailableSpots: { en: "No available parking spots nearby", fr: "Aucune place disponible à proximité", de: "Keine verfügbaren Parkplätze in der Nähe", it: "Nessun parcheggio disponibile nelle vicinanze" },
  enableLocationNavigate: { en: "Enable location to navigate", fr: "Activez la localisation pour naviguer", de: "Standort für Navigation aktivieren", it: "Attiva la posizione per navigare" },
  calculatingRoute: { en: "Calculating route…", fr: "Calcul de l'itinéraire…", de: "Route wird berechnet…", it: "Calcolo del percorso…" },
  couldNotCalculateRoute: { en: "Could not calculate route", fr: "Impossible de calculer l'itinéraire", de: "Route konnte nicht berechnet werden", it: "Impossibile calcolare il percorso" },

  // ── Location prompt ──
  locationNotAvailable: { en: "Location Not Available", fr: "Localisation non disponible", de: "Standort nicht verfügbar", it: "Posizione non disponibile" },
  locationBlocked: { en: "Location Access Blocked", fr: "Accès à la localisation bloqué", de: "Standortzugriff blockiert", it: "Accesso alla posizione bloccato" },
  enableLocation: { en: "Enable Location", fr: "Activer la localisation", de: "Standort aktivieren", it: "Attiva posizione" },
  locationUnavailableDesc: { en: "Your device doesn't support location services.", fr: "Votre appareil ne prend pas en charge la localisation.", de: "Ihr Gerät unterstützt keine Standortdienste.", it: "Il tuo dispositivo non supporta i servizi di localizzazione." },
  locationDeniedDesc: { en: "Location access was denied. To see nearby parking and walking times, enable location in your browser settings.", fr: "L'accès à la localisation a été refusé. Activez-la dans les paramètres de votre navigateur.", de: "Der Standortzugriff wurde verweigert. Aktivieren Sie ihn in Ihren Browsereinstellungen.", it: "L'accesso alla posizione è stato negato. Abilitalo nelle impostazioni del browser." },
  locationPromptDesc: { en: "Allow location access to find the nearest parking spots and see walking times.", fr: "Autorisez la localisation pour trouver les parkings les plus proches.", de: "Standortzugriff erlauben, um die nächsten Parkplätze zu finden.", it: "Consenti l'accesso alla posizione per trovare i parcheggi più vicini." },
  tryAgain: { en: "Try Again", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" },
  allowLocation: { en: "Allow Location", fr: "Autoriser la localisation", de: "Standort erlauben", it: "Consenti posizione" },

  // ── Bottom sheet (parking details) ──
  navigate: { en: "Navigate", fr: "Naviguer", de: "Navigieren", it: "Naviga" },
  perHour: { en: "per hour", fr: "par heure", de: "pro Stunde", it: "all'ora" },
  distance: { en: "distance", fr: "distance", de: "Entfernung", it: "distanza" },
  walk: { en: "walk", fr: "à pied", de: "zu Fuss", it: "a piedi" },
  drive: { en: "drive", fr: "en voiture", de: "Fahrt", it: "in auto" },
  indoor: { en: "Indoor", fr: "Intérieur", de: "Innen", it: "Interno" },
  outdoor: { en: "Outdoor", fr: "Extérieur", de: "Aussen", it: "Esterno" },
  activeSession: { en: "Active Session", fr: "Session active", de: "Aktive Sitzung", it: "Sessione attiva" },
  startSession: { en: "Start Session", fr: "Démarrer", de: "Sitzung starten", it: "Inizia sessione" },
  start: { en: "Start", fr: "Démarrer", de: "Starten", it: "Inizia" },
  reserve: { en: "Reserve", fr: "Réserver", de: "Reservieren", it: "Prenota" },
  reserved: { en: "Reserved", fr: "Réservé", de: "Reserviert", it: "Prenotato" },
  spotHeldForYou: { en: "Spot held for you", fr: "Place réservée pour vous", de: "Platz für Sie reserviert", it: "Posto riservato per te" },
  ending: { en: "Ending…", fr: "Fin en cours…", de: "Wird beendet…", it: "Terminando…" },
  starting: { en: "Starting…", fr: "Démarrage…", de: "Wird gestartet…", it: "Avvio…" },
  orTypePlate: { en: "Or type plate manually", fr: "Ou saisir la plaque manuellement", de: "Oder Kennzeichen manuell eingeben", it: "O digita la targa manualmente" },
  sessionStarted: { en: "Parking session started!", fr: "Session de stationnement démarrée !", de: "Parksitzung gestartet!", it: "Sessione di parcheggio avviata!" },
  failedStartSession: { en: "Failed to start session", fr: "Échec du démarrage", de: "Sitzung konnte nicht gestartet werden", it: "Avvio sessione fallito" },
  sessionEnded: { en: "Session ended", fr: "Session terminée", de: "Sitzung beendet", it: "Sessione terminata" },
  failedEndSession: { en: "Failed to end session", fr: "Échec de la fin de session", de: "Sitzung konnte nicht beendet werden", it: "Fine sessione fallita" },
  spotReserved: { en: "Spot reserved for 15 minutes!", fr: "Place réservée pour 15 minutes !", de: "Platz für 15 Minuten reserviert!", it: "Posto riservato per 15 minuti!" },
  reservationCancelled: { en: "Reservation cancelled", fr: "Réservation annulée", de: "Reservierung storniert", it: "Prenotazione annullata" },
  reservationExpired: { en: "Reservation expired", fr: "Réservation expirée", de: "Reservierung abgelaufen", it: "Prenotazione scaduta" },
  reservationExpires2min: { en: "Your parking reservation expires in 2 minutes!", fr: "Votre réservation expire dans 2 minutes !", de: "Ihre Reservierung läuft in 2 Minuten ab!", it: "La prenotazione scade tra 2 minuti!" },
  reservationExpires2minShort: { en: "Reservation expires in 2 minutes!", fr: "Expiration dans 2 minutes !", de: "Läuft in 2 Minuten ab!", it: "Scade tra 2 minuti!" },

  // ── Dashboard ──
  yourPass: { en: "Your Pass", fr: "Votre Pass", de: "Ihr Pass", it: "Il tuo Pass" },
  nearestAvailable: { en: "Nearest Available", fr: "Le plus proche disponible", de: "Nächster verfügbar", it: "Più vicino disponibile" },
  spaces: { en: "spaces", fr: "places", de: "Plätze", it: "posti" },
  quickPay: { en: "Quick Pay", fr: "Paiement rapide", de: "Schnellzahlung", it: "Pagamento rapido" },
  payWithTwint: { en: "Pay with TWINT", fr: "Payer avec TWINT", de: "Mit TWINT bezahlen", it: "Paga con TWINT" },
  evChargingNearby: { en: "EV Charging Nearby", fr: "Bornes de recharge à proximité", de: "E-Ladestationen in der Nähe", it: "Ricarica EV nelle vicinanze" },
  stationsAvailable: { en: "stations available", fr: "stations disponibles", de: "Stationen verfügbar", it: "stazioni disponibili" },
  view: { en: "View", fr: "Voir", de: "Ansehen", it: "Vedi" },
  noActiveSession: { en: "No active session. Start one from the map.", fr: "Aucune session active. Démarrez-en une depuis la carte.", de: "Keine aktive Sitzung. Starten Sie eine auf der Karte.", it: "Nessuna sessione attiva. Avviane una dalla mappa." },
  activeReservation: { en: "Active Reservation", fr: "Réservation active", de: "Aktive Reservierung", it: "Prenotazione attiva" },
  cancelReservation: { en: "Cancel Reservation", fr: "Annuler la réservation", de: "Reservierung stornieren", it: "Annulla prenotazione" },
  endAndPay: { en: "End & Pay", fr: "Terminer et payer", de: "Beenden & Bezahlen", it: "Termina e paga" },

  // ── Search ──
  searchParking: { en: "Search parking in Lausanne...", fr: "Rechercher un parking à Lausanne...", de: "Parkplatz in Lausanne suchen...", it: "Cerca parcheggio a Losanna..." },
  favorites: { en: "Favorites", fr: "Favoris", de: "Favoriten", it: "Preferiti" },
  evCharging: { en: "EV Charging", fr: "Recharge EV", de: "E-Ladung", it: "Ricarica EV" },
  noParkingsFound: { en: "No parkings found", fr: "Aucun parking trouvé", de: "Keine Parkplätze gefunden", it: "Nessun parcheggio trovato" },
  free: { en: "free", fr: "libres", de: "frei", it: "liberi" },

  // ── Profile ──
  profile: { en: "Profile", fr: "Profil", de: "Profil", it: "Profilo" },
  myVehicle: { en: "My Vehicle", fr: "Mon véhicule", de: "Mein Fahrzeug", it: "Il mio veicolo" },
  noPlateSaved: { en: "No plate saved", fr: "Aucune plaque enregistrée", de: "Kein Kennzeichen gespeichert", it: "Nessuna targa salvata" },
  tapToEdit: { en: "Tap to edit", fr: "Appuyer pour modifier", de: "Zum Bearbeiten tippen", it: "Tocca per modificare" },
  tapToClose: { en: "Tap to close", fr: "Appuyer pour fermer", de: "Zum Schließen tippen", it: "Tocca per chiudere" },
  myVehicles: { en: "My Vehicles", fr: "Mes véhicules", de: "Meine Fahrzeuge", it: "I miei veicoli" },
  manageCarsPlates: { en: "Manage cars & plates", fr: "Gérer véhicules et plaques", de: "Fahrzeuge & Kennzeichen", it: "Gestisci veicoli e targhe" },
  appearance: { en: "Appearance", fr: "Apparence", de: "Darstellung", it: "Aspetto" },
  darkLightAuto: { en: "Dark, Light, Auto", fr: "Sombre, Clair, Auto", de: "Dunkel, Hell, Auto", it: "Scuro, Chiaro, Auto" },
  paymentMethods: { en: "Payment Methods", fr: "Moyens de paiement", de: "Zahlungsmethoden", it: "Metodi di pagamento" },
  cardsBilling: { en: "Cards, invoices, billing", fr: "Cartes, factures, facturation", de: "Karten, Rechnungen, Abrechnung", it: "Carte, fatture, pagamenti" },
  notifications: { en: "Notifications", fr: "Notifications", de: "Benachrichtigungen", it: "Notifiche" },
  manageAlerts: { en: "Manage alerts", fr: "Gérer les alertes", de: "Benachrichtigungen verwalten", it: "Gestisci avvisi" },
  privacySecurity: { en: "Privacy & Security", fr: "Confidentialité et sécurité", de: "Datenschutz & Sicherheit", it: "Privacy e sicurezza" },
  dataFaceIdPassword: { en: "Data, Face ID, Password", fr: "Données, Face ID, mot de passe", de: "Daten, Face ID, Passwort", it: "Dati, Face ID, Password" },
  about: { en: "About", fr: "À propos", de: "Über", it: "Info" },
  missionLegalVersion: { en: "Mission, legal, version", fr: "Mission, juridique, version", de: "Mission, Rechtliches, Version", it: "Missione, legale, versione" },
  adminDashboard: { en: "Admin Dashboard", fr: "Tableau de bord admin", de: "Admin-Dashboard", it: "Dashboard admin" },
  analyticsOps: { en: "Analytics & operations", fr: "Analyses et opérations", de: "Analysen & Betrieb", it: "Analisi e operazioni" },
  sessionHistory: { en: "Session History", fr: "Historique des sessions", de: "Sitzungsverlauf", it: "Cronologia sessioni" },
  paymentHistory: { en: "Payment History", fr: "Historique des paiements", de: "Zahlungsverlauf", it: "Cronologia pagamenti" },
  noPastSessions: { en: "No past sessions yet", fr: "Aucune session passée", de: "Noch keine vergangenen Sitzungen", it: "Nessuna sessione passata" },
  noPayments: { en: "No payments yet", fr: "Aucun paiement", de: "Noch keine Zahlungen", it: "Nessun pagamento" },
  signOut: { en: "Sign Out", fr: "Déconnexion", de: "Abmelden", it: "Esci" },
  sessionsThisMonth: { en: "sessions this month", fr: "sessions ce mois", de: "Sitzungen diesen Monat", it: "sessioni questo mese" },
  sessionThisMonth: { en: "session this month", fr: "session ce mois", de: "Sitzung diesen Monat", it: "sessione questo mese" },
  selectLanguage: { en: "Select language", fr: "Choisir la langue", de: "Sprache wählen", it: "Seleziona lingua" },

  // ── Appearance settings ──
  theme: { en: "Theme", fr: "Thème", de: "Thema", it: "Tema" },
  light: { en: "Light", fr: "Clair", de: "Hell", it: "Chiaro" },
  dark: { en: "Dark", fr: "Sombre", de: "Dunkel", it: "Scuro" },
  auto: { en: "Auto", fr: "Auto", de: "Auto", it: "Auto" },
  autoMatchDevice: { en: "Auto will match your device's system setting.", fr: "Auto suivra les paramètres de votre appareil.", de: "Auto passt sich Ihren Geräteeinstellungen an.", it: "Auto seguirà le impostazioni del dispositivo." },

  // ── Notification settings ──
  categories: { en: "Categories", fr: "Catégories", de: "Kategorien", it: "Categorie" },
  sessionReminders: { en: "Session Reminders", fr: "Rappels de session", de: "Sitzungserinnerungen", it: "Promemoria sessione" },
  sessionRemindersDesc: { en: "Get notified before your session expires", fr: "Soyez averti avant l'expiration de votre session", de: "Benachrichtigung vor Ablauf der Sitzung", it: "Ricevi una notifica prima della scadenza" },
  expiryAlerts: { en: "Expiry Alerts", fr: "Alertes d'expiration", de: "Ablaufwarnungen", it: "Avvisi di scadenza" },
  expiryAlertsDesc: { en: "Alert when session time is almost up", fr: "Alerte quand la session arrive à son terme", de: "Warnung wenn die Sitzung fast abgelaufen ist", it: "Avviso quando la sessione sta per scadere" },
  availabilityAlerts: { en: "Availability Alerts", fr: "Alertes de disponibilité", de: "Verfügbarkeitswarnungen", it: "Avvisi di disponibilità" },
  availabilityAlertsDesc: { en: "Notify when spaces open at saved locations", fr: "Notification quand des places se libèrent", de: "Benachrichtigung wenn Plätze frei werden", it: "Notifica quando si liberano posti" },
  promotions: { en: "Promotions & Offers", fr: "Promotions et offres", de: "Aktionen & Angebote", it: "Promozioni e offerte" },
  promotionsDesc: { en: "Discounts and special parking deals", fr: "Réductions et offres de stationnement", de: "Rabatte und spezielle Parkangebote", it: "Sconti e offerte speciali parcheggio" },
  notificationsBlocked: { en: "Notifications are blocked in browser settings", fr: "Les notifications sont bloquées dans les paramètres du navigateur", de: "Benachrichtigungen sind in den Browsereinstellungen blockiert", it: "Le notifiche sono bloccate nelle impostazioni del browser" },

  // ── Privacy & Security ──
  personalData: { en: "Personal Data", fr: "Données personnelles", de: "Persönliche Daten", it: "Dati personali" },
  security: { en: "Security", fr: "Sécurité", de: "Sicherheit", it: "Sicurezza" },
  useFaceId: { en: "Use Face ID", fr: "Utiliser Face ID", de: "Face ID verwenden", it: "Usa Face ID" },
  unlockBiometrics: { en: "Unlock app with biometrics", fr: "Déverrouiller avec la biométrie", de: "App mit Biometrie entsperren", it: "Sblocca con biometria" },
  changePassword: { en: "Change Password", fr: "Changer le mot de passe", de: "Passwort ändern", it: "Cambia password" },
  newPasswordPlaceholder: { en: "New password", fr: "Nouveau mot de passe", de: "Neues Passwort", it: "Nuova password" },
  confirmPassword: { en: "Confirm password", fr: "Confirmer le mot de passe", de: "Passwort bestätigen", it: "Conferma password" },
  enterNewPasswordBelow: { en: "Enter your new password below.", fr: "Entrez votre nouveau mot de passe ci-dessous.", de: "Geben Sie unten Ihr neues Passwort ein.", it: "Inserisci la nuova password qui sotto." },
  deleteAccount: { en: "Delete Account", fr: "Supprimer le compte", de: "Konto löschen", it: "Elimina account" },
  notSet: { en: "Not set", fr: "Non défini", de: "Nicht festgelegt", it: "Non impostato" },
  passwordMin6: { en: "Password must be at least 6 characters", fr: "Le mot de passe doit contenir au moins 6 caractères", de: "Das Passwort muss mindestens 6 Zeichen lang sein", it: "La password deve contenere almeno 6 caratteri" },
  passwordsDontMatch: { en: "Passwords don't match", fr: "Les mots de passe ne correspondent pas", de: "Passwörter stimmen nicht überein", it: "Le password non corrispondono" },
  nameUpdated: { en: "Name updated!", fr: "Nom mis à jour !", de: "Name aktualisiert!", it: "Nome aggiornato!" },
  failedUpdateName: { en: "Failed to update name", fr: "Échec de la mise à jour", de: "Aktualisierung fehlgeschlagen", it: "Aggiornamento nome fallito" },
  faceIdEnabled: { en: "Face ID enabled", fr: "Face ID activé", de: "Face ID aktiviert", it: "Face ID attivato" },
  faceIdDisabled: { en: "Face ID disabled", fr: "Face ID désactivé", de: "Face ID deaktiviert", it: "Face ID disattivato" },
  biometricsNotSupported: { en: "Biometrics not supported on this device", fr: "Biométrie non supportée sur cet appareil", de: "Biometrie auf diesem Gerät nicht unterstützt", it: "Biometria non supportata su questo dispositivo" },
  biometricSetupFailed: { en: "Biometric setup cancelled or failed", fr: "Configuration biométrique annulée ou échouée", de: "Biometrie-Einrichtung abgebrochen oder fehlgeschlagen", it: "Configurazione biometrica annullata o fallita" },
  biometricActive: { en: "Biometric login active", fr: "Connexion biométrique active", de: "Biometrische Anmeldung aktiv", it: "Accesso biometrico attivo" },
  biometricsNotAvailable: { en: "Not available on this device", fr: "Non disponible sur cet appareil", de: "Auf diesem Gerät nicht verfügbar", it: "Non disponibile su questo dispositivo" },
  biometricLoginFailed: { en: "Credentials expired. Please sign in manually.", fr: "Identifiants expirés. Veuillez vous connecter manuellement.", de: "Anmeldedaten abgelaufen. Bitte melden Sie sich manuell an.", it: "Credenziali scadute. Effettua l'accesso manualmente." },
  biometricSuccess: { en: "Signed in with Face ID!", fr: "Connecté avec Face ID !", de: "Mit Face ID angemeldet!", it: "Accesso con Face ID effettuato!" },
  biometricFailed: { en: "Biometric authentication failed", fr: "Échec de l'authentification biométrique", de: "Biometrische Authentifizierung fehlgeschlagen", it: "Autenticazione biometrica fallita" },
  signInFaceId: { en: "Sign in with Face ID", fr: "Se connecter avec Face ID", de: "Mit Face ID anmelden", it: "Accedi con Face ID" },
  faceIdEnabledLogin: { en: "Face ID enabled for future logins!", fr: "Face ID activé pour les prochaines connexions !", de: "Face ID für zukünftige Anmeldungen aktiviert!", it: "Face ID attivato per i prossimi accessi!" },

  // ── Payment settings ──
  paymentSettings: { en: "Payment Settings", fr: "Paramètres de paiement", de: "Zahlungseinstellungen", it: "Impostazioni di pagamento" },
  managePaymentBilling: { en: "Manage your payment methods and billing", fr: "Gérez vos moyens de paiement et votre facturation", de: "Verwalten Sie Ihre Zahlungsmethoden", it: "Gestisci i metodi di pagamento" },
  addRemoveCards: { en: "Add, remove, or update your cards and payment methods through the secure payment portal.", fr: "Ajoutez, supprimez ou modifiez vos cartes via le portail de paiement sécurisé.", de: "Karten über das sichere Zahlungsportal hinzufügen oder entfernen.", it: "Aggiungi o rimuovi carte dal portale di pagamento sicuro." },
  managePaymentMethodsBtn: { en: "Manage Payment Methods", fr: "Gérer les moyens de paiement", de: "Zahlungsmethoden verwalten", it: "Gestisci metodi di pagamento" },
  invoicesReceipts: { en: "Invoices & Receipts", fr: "Factures et reçus", de: "Rechnungen & Belege", it: "Fatture e ricevute" },
  viewDownloadInvoices: { en: "View and download your invoices and payment receipts from the billing portal.", fr: "Consultez et téléchargez vos factures depuis le portail.", de: "Rechnungen und Belege im Portal einsehen.", it: "Visualizza e scarica le fatture dal portale." },
  viewInvoices: { en: "View Invoices", fr: "Voir les factures", de: "Rechnungen ansehen", it: "Vedi fatture" },
  opening: { en: "Opening…", fr: "Ouverture…", de: "Öffnen…", it: "Apertura…" },
  noPaymentAccount: { en: "No payment account found. Complete a payment first.", fr: "Aucun compte de paiement. Effectuez d'abord un paiement.", de: "Kein Zahlungskonto gefunden. Führen Sie zuerst eine Zahlung durch.", it: "Nessun account di pagamento. Completa prima un pagamento." },
  unableOpenPortal: { en: "Unable to open payment portal", fr: "Impossible d'ouvrir le portail de paiement", de: "Zahlungsportal konnte nicht geöffnet werden", it: "Impossibile aprire il portale di pagamento" },

  // ── My Vehicles ──
  addVehicle: { en: "Add Vehicle", fr: "Ajouter un véhicule", de: "Fahrzeug hinzufügen", it: "Aggiungi veicolo" },
  vehicleName: { en: "Vehicle name (e.g. Tesla Model 3)", fr: "Nom du véhicule (ex. Tesla Model 3)", de: "Fahrzeugname (z.B. Tesla Model 3)", it: "Nome veicolo (es. Tesla Model 3)" },
  licensePlatePlaceholder: { en: "License plate (e.g. VD·452·831)", fr: "Plaque d'immatriculation (ex. VD·452·831)", de: "Nummernschild (z.B. VD·452·831)", it: "Targa (es. VD·452·831)" },
  vehicleAdded: { en: "Vehicle added!", fr: "Véhicule ajouté !", de: "Fahrzeug hinzugefügt!", it: "Veicolo aggiunto!" },
  failedAddVehicle: { en: "Failed to add vehicle", fr: "Échec de l'ajout", de: "Hinzufügen fehlgeschlagen", it: "Aggiunta veicolo fallita" },
  vehicleRemoved: { en: "Vehicle removed", fr: "Véhicule supprimé", de: "Fahrzeug entfernt", it: "Veicolo rimosso" },
  defaultVehicleUpdated: { en: "Default vehicle updated", fr: "Véhicule par défaut mis à jour", de: "Standardfahrzeug aktualisiert", it: "Veicolo predefinito aggiornato" },
  noVehiclesSaved: { en: "No vehicles saved yet", fr: "Aucun véhicule enregistré", de: "Noch keine Fahrzeuge gespeichert", it: "Nessun veicolo salvato" },
  tapPlusToAdd: { en: "Tap + to add your first vehicle", fr: "Appuyez sur + pour ajouter un véhicule", de: "Tippen Sie auf + für Ihr erstes Fahrzeug", it: "Tocca + per aggiungere il primo veicolo" },
  licensePlateRequired: { en: "License plate is required", fr: "La plaque est obligatoire", de: "Kennzeichen ist erforderlich", it: "La targa è obbligatoria" },
  defaultLabel: { en: "Default", fr: "Par défaut", de: "Standard", it: "Predefinito" },
  saving: { en: "Saving…", fr: "Enregistrement…", de: "Speichern…", it: "Salvataggio…" },
  setAsDefault: { en: "Set as default", fr: "Définir par défaut", de: "Als Standard festlegen", it: "Imposta come predefinito" },

  // ── About page ──
  ourMission: { en: "Our Mission", fr: "Notre mission", de: "Unsere Mission", it: "La nostra missione" },
  ourMissionDesc: { en: "LibrePass makes parking in Lausanne effortless. We connect real-time availability data with intelligent routing so you spend less time circling and more time where it matters. Built with Swiss precision, open by design.", fr: "LibrePass facilite le stationnement à Lausanne. Nous connectons les données de disponibilité en temps réel avec un routage intelligent. Conçu avec la précision suisse.", de: "LibrePass macht das Parken in Lausanne mühelos. Wir verbinden Echtzeit-Verfügbarkeitsdaten mit intelligenter Routenführung. Mit Schweizer Präzision gebaut.", it: "LibrePass rende il parcheggio a Losanna facile. Colleghiamo i dati di disponibilità in tempo reale con il routing intelligente. Costruito con precisione svizzera." },
  dataPartners: { en: "Data Partners", fr: "Partenaires de données", de: "Datenpartner", it: "Partner dati" },
  dataPartnersDesc: { en: "Parking availability is sourced from the Swiss Federal Open Transport Data platform and enriched with time-based modelling. Mapping and navigation powered by Mapbox GL.", fr: "La disponibilité provient de la plateforme fédérale suisse de données de transport ouvertes. Cartographie par Mapbox GL.", de: "Parkverfügbarkeit stammt von der Schweizer Open Transport Data Plattform. Karten von Mapbox GL.", it: "La disponibilità proviene dalla piattaforma svizzera di dati aperti sui trasporti. Mappe di Mapbox GL." },
  dataPrivacy: { en: "Data Privacy", fr: "Confidentialité des données", de: "Datenschutz", it: "Privacy dei dati" },
  dataPrivacyDesc: { en: "Your data stays in Switzerland. Payments are processed securely via TWINT, and location data is used only to find your nearest spot.", fr: "Vos données restent en Suisse. Les paiements sont sécurisés via TWINT.", de: "Ihre Daten bleiben in der Schweiz. Zahlungen werden sicher über TWINT abgewickelt.", it: "I tuoi dati restano in Svizzera. I pagamenti sono gestiti in sicurezza da TWINT." },
  legal: { en: "Legal", fr: "Mentions légales", de: "Rechtliches", it: "Note legali" },
  legalDesc: { en: "LibrePass is provided as-is. Availability data is indicative and may not reflect real-time conditions at all times. By using the app you agree to our terms of service.", fr: "LibrePass est fourni tel quel. Les données sont indicatives. En utilisant l'application, vous acceptez nos conditions.", de: "LibrePass wird wie besehen bereitgestellt. Verfügbarkeitsdaten sind indikativ. Mit der Nutzung stimmen Sie unseren Bedingungen zu.", it: "LibrePass è fornito così com'è. I dati sono indicativi. Usando l'app accetti i nostri termini di servizio." },
  reportIncorrectCount: { en: "Report Incorrect Spot Count", fr: "Signaler un comptage incorrect", de: "Falsche Stellplatzzahl melden", it: "Segnala conteggio errato" },
  reportDesc: { en: "See a parking showing wrong availability? Let us know so we can improve data accuracy.", fr: "Un parking affiche une disponibilité incorrecte ? Signalez-le pour améliorer la précision.", de: "Sehen Sie falsche Verfügbarkeit? Melden Sie es, damit wir die Genauigkeit verbessern.", it: "Vedi disponibilità errata? Segnalalo per migliorare la precisione." },
  reportPlaceholder: { en: "e.g. Parking Riponne shows 45 spots but it's actually full…", fr: "Ex. Le Parking Riponne affiche 45 places mais il est plein…", de: "Z.B. Parking Riponne zeigt 45 Plätze aber ist voll…", it: "Es. Il Parking Riponne mostra 45 posti ma è pieno…" },
  submitReport: { en: "Submit Report", fr: "Envoyer le signalement", de: "Meldung senden", it: "Invia segnalazione" },
  sending: { en: "Sending…", fr: "Envoi…", de: "Senden…", it: "Invio…" },
  reportSubmitted: { en: "Report submitted — thank you!", fr: "Signalement envoyé — merci !", de: "Meldung gesendet — danke!", it: "Segnalazione inviata — grazie!" },
  pleaseDescribeIssue: { en: "Please describe the issue", fr: "Veuillez décrire le problème", de: "Bitte beschreiben Sie das Problem", it: "Descrivi il problema" },

  // ── Digital Permit / Receipt ──
  paymentConfirmed: { en: "Payment Confirmed", fr: "Paiement confirmé", de: "Zahlung bestätigt", it: "Pagamento confermato" },
  proofOfPayment: { en: "Proof of Payment", fr: "Preuve de paiement", de: "Zahlungsnachweis", it: "Prova di pagamento" },
  backToMap: { en: "Back to Map", fr: "Retour à la carte", de: "Zurück zur Karte", it: "Torna alla mappa" },
  parkingLot: { en: "Parking Lot", fr: "Parking", de: "Parkplatz", it: "Parcheggio" },
  validFrom: { en: "Valid From", fr: "Valide depuis", de: "Gültig ab", it: "Valido da" },
  vehicle: { en: "Vehicle", fr: "Véhicule", de: "Fahrzeug", it: "Veicolo" },
  totalPaid: { en: "Total Paid", fr: "Total payé", de: "Gesamtbetrag", it: "Totale pagato" },
  sessionActive: { en: "Session Active", fr: "Session active", de: "Sitzung aktiv", it: "Sessione attiva" },
  sessionEndedAt: { en: "Session ended at", fr: "Session terminée à", de: "Sitzung beendet um", it: "Sessione terminata alle" },
  sessionNotFound: { en: "Session not found", fr: "Session non trouvée", de: "Sitzung nicht gefunden", it: "Sessione non trovata" },
  returnToMap: { en: "Return to Map", fr: "Retour à la carte", de: "Zurück zur Karte", it: "Torna alla mappa" },

  // ── Admin dashboard ──
  accessDenied: { en: "Access Denied", fr: "Accès refusé", de: "Zugriff verweigert", it: "Accesso negato" },
  noAdminPrivileges: { en: "You don't have administrator privileges. Contact the system admin to request access.", fr: "Vous n'avez pas les privilèges administrateur. Contactez l'administrateur.", de: "Sie haben keine Administratorrechte. Kontaktieren Sie den Systemadministrator.", it: "Non hai i privilegi di amministratore. Contatta l'amministratore di sistema." },
  backToApp: { en: "Back to App", fr: "Retour à l'application", de: "Zurück zur App", it: "Torna all'app" },
  totalSessions: { en: "Total Sessions", fr: "Sessions totales", de: "Gesamtsitzungen", it: "Sessioni totali" },
  activeNow: { en: "Active Now", fr: "Actives maintenant", de: "Jetzt aktiv", it: "Attive ora" },
  revenue14d: { en: "Revenue (14d)", fr: "Revenus (14j)", de: "Umsatz (14T)", it: "Ricavi (14g)" },
  avgOccupancy: { en: "Avg Occupancy", fr: "Occupation moy.", de: "Durchschn. Auslastung", it: "Occupazione media" },
  parkingSessionsPerDay: { en: "Parking Sessions per Day", fr: "Sessions par jour", de: "Parksitzungen pro Tag", it: "Sessioni al giorno" },
  liveOccupancy: { en: "Live Occupancy", fr: "Occupation en direct", de: "Live-Auslastung", it: "Occupazione in tempo reale" },
  realtime: { en: "Real-time", fr: "Temps réel", de: "Echtzeit", it: "Tempo reale" },
  dataRefreshes: { en: "Data refreshes every 30 seconds", fr: "Données rafraîchies toutes les 30 secondes", de: "Daten werden alle 30 Sekunden aktualisiert", it: "Dati aggiornati ogni 30 secondi" },

  // ── Navigation panel ──
  replayInstruction: { en: "Replay instruction", fr: "Relire l'instruction", de: "Anweisung wiederholen", it: "Ripeti istruzione" },
  muteVoice: { en: "Mute voice", fr: "Couper la voix", de: "Stimme stumm", it: "Disattiva voce" },
  unmuteVoice: { en: "Unmute voice", fr: "Activer la voix", de: "Stimme aktivieren", it: "Attiva voce" },
  step: { en: "Step", fr: "Étape", de: "Schritt", it: "Passo" },
  min: { en: "min", fr: "min", de: "Min", it: "min" },

  // ── Not found ──
  pageNotFound: { en: "Page not found", fr: "Page non trouvée", de: "Seite nicht gefunden", it: "Pagina non trovata" },

  // ── Mon Pass ──
  monPassTitle: { en: "My Pass Lausanne", fr: "Mon Pass Lausanne", de: "Mein Pass Lausanne", it: "Il Mio Pass Losanna" },

  // ── Detail views ──
  sessionDetails: { en: "Session Details", fr: "Détails de la session", de: "Sitzungsdetails", it: "Dettagli sessione" },
  paymentDetails: { en: "Payment Details", fr: "Détails du paiement", de: "Zahlungsdetails", it: "Dettagli pagamento" },
  duration: { en: "Duration", fr: "Durée", de: "Dauer", it: "Durata" },
  startTime: { en: "Start", fr: "Début", de: "Start", it: "Inizio" },
  endTime: { en: "End", fr: "Fin", de: "Ende", it: "Fine" },
  amount: { en: "Amount", fr: "Montant", de: "Betrag", it: "Importo" },
  receiptId: { en: "Receipt ID", fr: "N° de reçu", de: "Beleg-Nr.", it: "N° ricevuta" },
  paid: { en: "Paid", fr: "Payé", de: "Bezahlt", it: "Pagato" },
  pending: { en: "Pending", fr: "En attente", de: "Ausstehend", it: "In attesa" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  return entry?.[locale] ?? entry?.en ?? key;
}

export default translations;
