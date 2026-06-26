import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "ar" | "fr";

export interface Translations {
  explore: string;
  topics: string;
  methodology: string;
  submitPoll: string;
  signIn: string;
  register: string;
  signOut: string;
  profile: string;
  admin: string;
  searchPolls: string;
  voteButton: string;
  yourVote: string;
  signInToVote: string;
  totalVotes: string;
  liveInAlgeria: string;
  livePoll: string;
  submitaPoll: string;
  continueWithGoogle: string;
  orSignInWithEmail: string;
  orCreateWithEmail: string;
  signInToDzPulse: string;
  createAccount: string;
  hotTopics: string;
  allTopics: string;
  explorePolls: string;
  trending: string;
  close: string;
  live: string;
  reportPoll: string;
  suggestAnswer: string;
  viewDiscussion: string;
  participants: string;
  votes: string;
  polls: string;
  opinionMovement: string;
  prev: string;
  next: string;
  aboutDzPulse: string;
  suggestaPoll: string;
  aboutUs: string;
  howItWorks: string;
  wilayaPromptTitle: string;
  wilayaPromptDesc: string;
  wilayaLabel: string;
  skip: string;
  confirmVote: string;
  chooseWilaya: string;
  national: string;
  changeVote: string;
  submitVote: string;
  recording: string;
  voteRecorded: string;
  couldNotVote: string;
  pollNotFound: string;
  backToPolls: string;
  overview: string;
  discussion: string;
  relatedPolls: string;
  closed: string;
  draft: string;
  upcoming: string;
  archived: string;
  noVotesYet: string;
  noPollsFound: string;
  tryDifferentFilters: string;
  sortBy: string;
  filterBy: string;
  allStatuses: string;
  mostActive: string;
  newest: string;
  mostVoted: string;
  closestSplit: string;
  allRegions: string;
  wilayaSpecific: string;
  sharePoll: string;
  shareOnTwitter: string;
  shareOnFacebook: string;
  copyLink: string;
  linkCopied: string;
  suggestAnAnswer: string;
  reportThisPoll: string;
  reportSubmitted: string;
  thankYouFeedback: string;
  couldNotSubmitReport: string;
  feedbackTitle: string;
  feedbackSubtitle: string;
  feedbackCategory: string;
  feedbackMessage: string;
  feedbackSubmit: string;
  feedbackSuccess: string;
  feedbackError: string;
  generalFeedback: string;
  bugReport: string;
  featureRequest: string;
  pollSuggestionFeedback: string;
  other: string;
  email: string;
  password: string;
  name: string;
  username: string;
  forgotPassword: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  signingIn: string;
  creating: string;
  algeriasVoice: string;
  platformDesc: string;
  featuredPolls: string;
  trendingNow: string;
  viewAll: string;
  methodology_page_title: string;
  methodology_page_desc: string;
  about_page_title: string;
  about_page_desc: string;
  submit_page_title: string;
  submit_page_desc: string;
  pollLanguageLabel: string;
  translationsLabel: string;
  arabicLabel: string;
  frenchLabel: string;
  englishLabel: string;
  titleLabel: string;
  subtitleLabel: string;
  descriptionLabel: string;
  optionLabel: string;
  saveAsDraft: string;
  publishNow: string;
  publishing: string;
  saving: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  create: string;
  search: string;
  filter: string;
  refresh: string;
  loading: string;
  error: string;
  success: string;
  required: string;
  optional: string;
  signInRequired: string;
  accessRestricted: string;
  adminRequired: string;
  home: string;
  livePolls: string;
  votesCast: string;
  voteDirectly: string;
  allPolls: string;
  leading: string;
  seeAll: string;
  haveAQuestion: string;
  submitPollCTA: string;
  liveOpinionAlgeria: string;
  voteOnLivePolls: string;
  joinDiscussion: string;
  oneVoteFair: string;
  createOneFree: string;
  bySigningIn: string;
  termsOfUse: string;
  privacyPolicy: string;
  createDzPulseAccount: string;
  joinAlgerianOpinion: string;
  ageRange: string;
  optionalDetails: string;
  wilayaOptional: string;
  showOptionalDetails: string;
  hideOptionalDetails: string;
  userNotFound: string;
  pollsVoted: string;
  pollsSuggested: string;
  yourVotedPolls: string;
  noPollsVotedYet: string;
  joined: string;
  topicsPageTitle: string;
  topicsPageDesc: string;
  browseByTopic: string;
  totalPolls: string;
  submitQuestion: string;
  submitQuestionDesc: string;
}

const EN: Translations = {
  explore: "Explore",
  topics: "Topics",
  methodology: "Methodology",
  submitPoll: "Submit Poll",
  signIn: "Sign in",
  register: "Register",
  signOut: "Sign out",
  profile: "Profile",
  admin: "Admin",
  searchPolls: "Search polls...",
  voteButton: "Vote",
  yourVote: "Your vote",
  signInToVote: "Sign in to vote",
  totalVotes: "total votes",
  liveInAlgeria: "Live in Algeria",
  livePoll: "Live",
  submitaPoll: "Submit a Poll",
  continueWithGoogle: "Continue with Google",
  orSignInWithEmail: "or sign in with email",
  orCreateWithEmail: "or create account with email",
  signInToDzPulse: "Sign in to DzPulse",
  createAccount: "Create your account",
  hotTopics: "Hot Topics",
  allTopics: "All topics",
  explorePolls: "Explore Polls",
  trending: "Trending",
  close: "Close",
  live: "Live",
  reportPoll: "Report poll",
  suggestAnswer: "Suggest an answer",
  viewDiscussion: "View all discussion",
  participants: "participants",
  votes: "votes",
  polls: "polls",
  opinionMovement: "Opinion movement",
  prev: "Prev",
  next: "Next",
  aboutDzPulse: "About DzPulse",
  suggestaPoll: "Suggest a poll",
  aboutUs: "About us",
  howItWorks: "How it works",
  wilayaPromptTitle: "Where are you from?",
  wilayaPromptDesc: "Your wilaya helps us show regional breakdowns. This is optional.",
  wilayaLabel: "Wilaya",
  skip: "Skip",
  confirmVote: "Confirm vote",
  chooseWilaya: "Choose your wilaya (optional)",
  national: "All Algeria",
  changeVote: "Change my vote",
  submitVote: "Submit Vote",
  recording: "Recording...",
  voteRecorded: "Vote recorded!",
  couldNotVote: "Could not record vote",
  pollNotFound: "Poll not found.",
  backToPolls: "Back to Polls",
  overview: "Overview",
  discussion: "Discussion",
  relatedPolls: "Related Polls",
  closed: "Closed",
  draft: "Draft",
  upcoming: "Upcoming",
  archived: "Archived",
  noVotesYet: "No votes yet",
  noPollsFound: "No polls found",
  tryDifferentFilters: "Try adjusting your filters or search term.",
  sortBy: "Sort by",
  filterBy: "Filter",
  allStatuses: "All statuses",
  mostActive: "Most Active",
  newest: "Newest",
  mostVoted: "Most Voted",
  closestSplit: "Closest Split",
  allRegions: "All regions",
  wilayaSpecific: "Wilaya-specific",
  sharePoll: "Share poll",
  shareOnTwitter: "Share on X",
  shareOnFacebook: "Share on Facebook",
  copyLink: "Copy link",
  linkCopied: "Link copied!",
  suggestAnAnswer: "Suggest an answer",
  reportThisPoll: "Report this poll",
  reportSubmitted: "Report submitted",
  thankYouFeedback: "Thank you for helping maintain quality.",
  couldNotSubmitReport: "Could not submit report",
  feedbackTitle: "Share Your Feedback",
  feedbackSubtitle: "Help us improve DzPulse. Your feedback shapes the platform.",
  feedbackCategory: "Category",
  feedbackMessage: "Message",
  feedbackSubmit: "Submit feedback",
  feedbackSuccess: "Thank you for your feedback!",
  feedbackError: "Could not submit feedback. Please try again.",
  generalFeedback: "General feedback",
  bugReport: "Bug report",
  featureRequest: "Feature request",
  pollSuggestionFeedback: "Poll suggestion",
  other: "Other",
  email: "Email address",
  password: "Password",
  name: "Full name",
  username: "Username",
  forgotPassword: "Forgot password?",
  alreadyHaveAccount: "Already have an account?",
  dontHaveAccount: "Don't have an account?",
  signingIn: "Signing in...",
  creating: "Creating account...",
  algeriasVoice: "Algeria's Voice",
  platformDesc: "Algeria's live public opinion, organised by topic and region",
  featuredPolls: "Featured Polls",
  trendingNow: "Trending Now",
  viewAll: "View all",
  methodology_page_title: "Our Methodology",
  methodology_page_desc: "How DzPulse collects, displays, and contextualises public opinion data.",
  about_page_title: "About DzPulse",
  about_page_desc: "The independent platform for Algerian public opinion.",
  submit_page_title: "Suggest a Poll",
  submit_page_desc: "Have an important question for Algeria? Suggest a poll topic.",
  pollLanguageLabel: "Poll Language",
  translationsLabel: "Translations",
  arabicLabel: "Arabic",
  frenchLabel: "French",
  englishLabel: "English",
  titleLabel: "Title",
  subtitleLabel: "Subtitle",
  descriptionLabel: "Description",
  optionLabel: "Option",
  saveAsDraft: "Save as Draft",
  publishNow: "Publish Now",
  publishing: "Publishing...",
  saving: "Saving...",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  edit: "Edit",
  create: "Create",
  search: "Search",
  filter: "Filter",
  refresh: "Refresh",
  loading: "Loading...",
  error: "An error occurred",
  success: "Success",
  required: "required",
  optional: "optional",
  signInRequired: "Sign in required",
  accessRestricted: "Access Restricted",
  adminRequired: "You need admin access to view this page.",
  home: "Home",
  livePolls: "live polls",
  votesCast: "votes cast",
  voteDirectly: "Vote directly — one vote per poll, anonymous",
  allPolls: "All polls",
  leading: "Leading:",
  seeAll: "See all",
  haveAQuestion: "Have a question for Algeria?",
  submitPollCTA: "Submit a poll idea and our editorial team will review it.",
  liveOpinionAlgeria: "Live public opinion in Algeria",
  voteOnLivePolls: "Vote on live polls",
  joinDiscussion: "Join civic discussion",
  oneVoteFair: "One vote, counted fairly",
  createOneFree: "Create one — it's free",
  bySigningIn: "By signing in, you agree to our",
  termsOfUse: "Terms of Use",
  privacyPolicy: "Privacy Policy",
  createDzPulseAccount: "Create your DzPulse account",
  joinAlgerianOpinion: "Join the conversation on Algerian public opinion",
  ageRange: "Age range",
  optionalDetails: "Optional details",
  wilayaOptional: "Wilaya (optional)",
  showOptionalDetails: "Show optional details",
  hideOptionalDetails: "Hide optional details",
  userNotFound: "User not found.",
  pollsVoted: "Polls Voted",
  pollsSuggested: "Polls Suggested",
  yourVotedPolls: "Your Voted Polls",
  noPollsVotedYet: "No polls voted on yet. Explore polls and share your opinion.",
  joined: "Joined",
  topicsPageTitle: "Topics",
  topicsPageDesc: "Browse polls by topic category",
  browseByTopic: "Browse by topic",
  totalPolls: "polls",
  submitQuestion: "Submit a question",
  submitQuestionDesc: "Don't see your topic? Suggest a poll idea.",
};

const FR: Translations = {
  explore: "Explorer",
  topics: "Thèmes",
  methodology: "Méthodologie",
  submitPoll: "Proposer un sondage",
  signIn: "Se connecter",
  register: "S'inscrire",
  signOut: "Se déconnecter",
  profile: "Profil",
  admin: "Admin",
  searchPolls: "Rechercher des sondages...",
  voteButton: "Voter",
  yourVote: "Votre vote",
  signInToVote: "Connectez-vous pour voter",
  totalVotes: "votes au total",
  liveInAlgeria: "En direct en Algérie",
  livePoll: "En direct",
  submitaPoll: "Proposer un sondage",
  continueWithGoogle: "Continuer avec Google",
  orSignInWithEmail: "ou se connecter par e-mail",
  orCreateWithEmail: "ou créer un compte par e-mail",
  signInToDzPulse: "Se connecter à DzPulse",
  createAccount: "Créer votre compte",
  hotTopics: "Sujets chauds",
  allTopics: "Tous les thèmes",
  explorePolls: "Explorer les sondages",
  trending: "Tendance",
  close: "Serré",
  live: "En direct",
  reportPoll: "Signaler ce sondage",
  suggestAnswer: "Suggérer une réponse",
  viewDiscussion: "Voir toute la discussion",
  participants: "participants",
  votes: "votes",
  polls: "sondages",
  opinionMovement: "Évolution des opinions",
  prev: "Préc.",
  next: "Suiv.",
  aboutDzPulse: "À propos de DzPulse",
  suggestaPoll: "Suggérer un sondage",
  aboutUs: "À propos",
  howItWorks: "Comment ça marche",
  wilayaPromptTitle: "D'où venez-vous ?",
  wilayaPromptDesc: "Votre wilaya nous aide à afficher des résultats régionaux. Facultatif.",
  wilayaLabel: "Wilaya",
  skip: "Ignorer",
  confirmVote: "Confirmer le vote",
  chooseWilaya: "Choisir votre wilaya (facultatif)",
  national: "Toute l'Algérie",
  changeVote: "Changer mon vote",
  submitVote: "Soumettre le vote",
  recording: "Enregistrement...",
  voteRecorded: "Vote enregistré !",
  couldNotVote: "Impossible d'enregistrer le vote",
  pollNotFound: "Sondage introuvable.",
  backToPolls: "Retour aux sondages",
  overview: "Aperçu",
  discussion: "Discussion",
  relatedPolls: "Sondages similaires",
  closed: "Fermé",
  draft: "Brouillon",
  upcoming: "À venir",
  archived: "Archivé",
  noVotesYet: "Aucun vote pour l'instant",
  noPollsFound: "Aucun sondage trouvé",
  tryDifferentFilters: "Essayez de modifier vos filtres ou votre recherche.",
  sortBy: "Trier par",
  filterBy: "Filtrer",
  allStatuses: "Tous les statuts",
  mostActive: "Les plus actifs",
  newest: "Les plus récents",
  mostVoted: "Les plus votés",
  closestSplit: "Résultat le plus serré",
  allRegions: "Toutes les régions",
  wilayaSpecific: "Par wilaya",
  sharePoll: "Partager le sondage",
  shareOnTwitter: "Partager sur X",
  shareOnFacebook: "Partager sur Facebook",
  copyLink: "Copier le lien",
  linkCopied: "Lien copié !",
  suggestAnAnswer: "Suggérer une réponse",
  reportThisPoll: "Signaler ce sondage",
  reportSubmitted: "Signalement soumis",
  thankYouFeedback: "Merci de contribuer à la qualité de la plateforme.",
  couldNotSubmitReport: "Impossible de soumettre le signalement",
  feedbackTitle: "Partagez votre avis",
  feedbackSubtitle: "Aidez-nous à améliorer DzPulse. Vos retours façonnent la plateforme.",
  feedbackCategory: "Catégorie",
  feedbackMessage: "Message",
  feedbackSubmit: "Envoyer le commentaire",
  feedbackSuccess: "Merci pour votre retour !",
  feedbackError: "Impossible de soumettre le commentaire. Veuillez réessayer.",
  generalFeedback: "Commentaire général",
  bugReport: "Rapport de bug",
  featureRequest: "Demande de fonctionnalité",
  pollSuggestionFeedback: "Suggestion de sondage",
  other: "Autre",
  email: "Adresse e-mail",
  password: "Mot de passe",
  name: "Nom complet",
  username: "Nom d'utilisateur",
  forgotPassword: "Mot de passe oublié ?",
  alreadyHaveAccount: "Vous avez déjà un compte ?",
  dontHaveAccount: "Pas encore de compte ?",
  signingIn: "Connexion...",
  creating: "Création du compte...",
  algeriasVoice: "La voix de l'Algérie",
  platformDesc: "L'opinion publique algérienne en direct, organisée par thème et région",
  featuredPolls: "Sondages à la une",
  trendingNow: "Tendances actuelles",
  viewAll: "Voir tout",
  methodology_page_title: "Notre méthodologie",
  methodology_page_desc: "Comment DzPulse collecte, affiche et contextualise les données d'opinion publique.",
  about_page_title: "À propos de DzPulse",
  about_page_desc: "La plateforme indépendante d'opinion publique algérienne.",
  submit_page_title: "Suggérer un sondage",
  submit_page_desc: "Vous avez une question importante pour l'Algérie ? Proposez un sujet de sondage.",
  pollLanguageLabel: "Langue du sondage",
  translationsLabel: "Traductions",
  arabicLabel: "Arabe",
  frenchLabel: "Français",
  englishLabel: "Anglais",
  titleLabel: "Titre",
  subtitleLabel: "Sous-titre",
  descriptionLabel: "Description",
  optionLabel: "Option",
  saveAsDraft: "Enregistrer comme brouillon",
  publishNow: "Publier maintenant",
  publishing: "Publication...",
  saving: "Enregistrement...",
  cancel: "Annuler",
  save: "Enregistrer",
  delete: "Supprimer",
  edit: "Modifier",
  create: "Créer",
  search: "Rechercher",
  filter: "Filtrer",
  refresh: "Actualiser",
  loading: "Chargement...",
  error: "Une erreur est survenue",
  success: "Succès",
  required: "requis",
  optional: "facultatif",
  signInRequired: "Connexion requise",
  accessRestricted: "Accès restreint",
  adminRequired: "Vous devez avoir un accès administrateur pour voir cette page.",
  home: "Accueil",
  livePolls: "sondages en direct",
  votesCast: "votes exprimés",
  voteDirectly: "Votez directement — un vote par sondage, anonyme",
  allPolls: "Tous les sondages",
  leading: "En tête :",
  seeAll: "Voir tout",
  haveAQuestion: "Vous avez une question pour l'Algérie ?",
  submitPollCTA: "Proposez une idée de sondage et notre équipe éditoriale l'examinera.",
  liveOpinionAlgeria: "Opinion publique en direct en Algérie",
  voteOnLivePolls: "Voter sur des sondages en direct",
  joinDiscussion: "Rejoindre le débat civique",
  oneVoteFair: "Un vote, comptabilisé équitablement",
  createOneFree: "Créez-en un — c'est gratuit",
  bySigningIn: "En vous connectant, vous acceptez nos",
  termsOfUse: "Conditions d'utilisation",
  privacyPolicy: "Politique de confidentialité",
  createDzPulseAccount: "Créez votre compte DzPulse",
  joinAlgerianOpinion: "Rejoignez la conversation sur l'opinion publique algérienne",
  ageRange: "Tranche d'âge",
  optionalDetails: "Détails facultatifs",
  wilayaOptional: "Wilaya (facultatif)",
  showOptionalDetails: "Afficher les détails facultatifs",
  hideOptionalDetails: "Masquer les détails facultatifs",
  userNotFound: "Utilisateur introuvable.",
  pollsVoted: "Sondages votés",
  pollsSuggested: "Sondages proposés",
  yourVotedPolls: "Vos sondages votés",
  noPollsVotedYet: "Aucun sondage voté pour l'instant. Explorez les sondages et partagez votre avis.",
  joined: "Inscrit",
  topicsPageTitle: "Thèmes",
  topicsPageDesc: "Parcourir les sondages par thème",
  browseByTopic: "Parcourir par thème",
  totalPolls: "sondages",
  submitQuestion: "Proposer une question",
  submitQuestionDesc: "Vous ne trouvez pas votre thème ? Suggérez une idée de sondage.",
};

const AR: Translations = {
  explore: "استكشاف",
  topics: "المواضيع",
  methodology: "المنهجية",
  submitPoll: "اقتراح استطلاع",
  signIn: "تسجيل الدخول",
  register: "إنشاء حساب",
  signOut: "تسجيل الخروج",
  profile: "الملف الشخصي",
  admin: "الإدارة",
  searchPolls: "ابحث عن استطلاعات...",
  voteButton: "صوّت",
  yourVote: "صوتك",
  signInToVote: "سجّل الدخول للتصويت",
  totalVotes: "إجمالي الأصوات",
  liveInAlgeria: "مباشر في الجزائر",
  livePoll: "مباشر",
  submitaPoll: "اقتراح استطلاع",
  continueWithGoogle: "المتابعة بواسطة Google",
  orSignInWithEmail: "أو الدخول بالبريد الإلكتروني",
  orCreateWithEmail: "أو إنشاء حساب بالبريد الإلكتروني",
  signInToDzPulse: "الدخول إلى DzPulse",
  createAccount: "إنشاء حسابك",
  hotTopics: "أبرز المواضيع",
  allTopics: "كل المواضيع",
  explorePolls: "استكشاف الاستطلاعات",
  trending: "رائج",
  close: "متقارب",
  live: "مباشر",
  reportPoll: "الإبلاغ عن الاستطلاع",
  suggestAnswer: "اقتراح إجابة",
  viewDiscussion: "عرض كل النقاشات",
  participants: "مشارك",
  votes: "أصوات",
  polls: "استطلاعات",
  opinionMovement: "تطور الآراء",
  prev: "السابق",
  next: "التالي",
  aboutDzPulse: "حول DzPulse",
  suggestaPoll: "اقتراح استطلاع",
  aboutUs: "من نحن",
  howItWorks: "كيف يعمل",
  wilayaPromptTitle: "من أي ولاية أنت؟",
  wilayaPromptDesc: "ولايتك تساعدنا على عرض نتائج إقليمية. هذا اختياري.",
  wilayaLabel: "الولاية",
  skip: "تخطي",
  confirmVote: "تأكيد التصويت",
  chooseWilaya: "اختر ولايتك (اختياري)",
  national: "كل الجزائر",
  changeVote: "تغيير صوتي",
  submitVote: "تأكيد التصويت",
  recording: "جارٍ التسجيل...",
  voteRecorded: "تم تسجيل صوتك!",
  couldNotVote: "تعذّر تسجيل الصوت",
  pollNotFound: "الاستطلاع غير موجود.",
  backToPolls: "العودة إلى الاستطلاعات",
  overview: "نظرة عامة",
  discussion: "نقاش",
  relatedPolls: "استطلاعات ذات صلة",
  closed: "مغلق",
  draft: "مسودة",
  upcoming: "قادم",
  archived: "مؤرشف",
  noVotesYet: "لا توجد أصوات بعد",
  noPollsFound: "لم يُعثر على استطلاعات",
  tryDifferentFilters: "جرّب تعديل الفلاتر أو مصطلح البحث.",
  sortBy: "ترتيب حسب",
  filterBy: "تصفية",
  allStatuses: "كل الحالات",
  mostActive: "الأكثر نشاطاً",
  newest: "الأحدث",
  mostVoted: "الأكثر تصويتاً",
  closestSplit: "أقرب نتيجة",
  allRegions: "كل المناطق",
  wilayaSpecific: "حسب الولاية",
  sharePoll: "مشاركة الاستطلاع",
  shareOnTwitter: "المشاركة على X",
  shareOnFacebook: "المشاركة على Facebook",
  copyLink: "نسخ الرابط",
  linkCopied: "تم نسخ الرابط!",
  suggestAnAnswer: "اقتراح إجابة",
  reportThisPoll: "الإبلاغ عن هذا الاستطلاع",
  reportSubmitted: "تم إرسال البلاغ",
  thankYouFeedback: "شكراً لمساهمتك في الحفاظ على جودة المنصة.",
  couldNotSubmitReport: "تعذّر إرسال البلاغ",
  feedbackTitle: "شاركنا رأيك",
  feedbackSubtitle: "ساعدنا في تحسين DzPulse. ملاحظاتك تُشكّل المنصة.",
  feedbackCategory: "الفئة",
  feedbackMessage: "الرسالة",
  feedbackSubmit: "إرسال الملاحظة",
  feedbackSuccess: "شكراً على ملاحظتك!",
  feedbackError: "تعذّر إرسال الملاحظة. يرجى المحاولة مرة أخرى.",
  generalFeedback: "ملاحظة عامة",
  bugReport: "الإبلاغ عن خطأ",
  featureRequest: "طلب ميزة",
  pollSuggestionFeedback: "اقتراح استطلاع",
  other: "أخرى",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  name: "الاسم الكامل",
  username: "اسم المستخدم",
  forgotPassword: "نسيت كلمة المرور؟",
  alreadyHaveAccount: "هل لديك حساب بالفعل؟",
  dontHaveAccount: "ليس لديك حساب؟",
  signingIn: "جارٍ تسجيل الدخول...",
  creating: "جارٍ إنشاء الحساب...",
  algeriasVoice: "صوت الجزائر",
  platformDesc: "الرأي العام الجزائري مباشرةً، منظّم حسب الموضوع والمنطقة",
  featuredPolls: "استطلاعات مميزة",
  trendingNow: "الأكثر رواجاً الآن",
  viewAll: "عرض الكل",
  methodology_page_title: "منهجيتنا",
  methodology_page_desc: "كيف تجمع DzPulse بيانات الرأي العام وتعرضها وتضعها في سياقها.",
  about_page_title: "حول DzPulse",
  about_page_desc: "المنصة المستقلة للرأي العام الجزائري.",
  submit_page_title: "اقتراح استطلاع",
  submit_page_desc: "هل لديك سؤال مهم للجزائر؟ اقترح موضوع استطلاع.",
  pollLanguageLabel: "لغة الاستطلاع",
  translationsLabel: "الترجمات",
  arabicLabel: "العربية",
  frenchLabel: "الفرنسية",
  englishLabel: "الإنجليزية",
  titleLabel: "العنوان",
  subtitleLabel: "العنوان الفرعي",
  descriptionLabel: "الوصف",
  optionLabel: "خيار",
  saveAsDraft: "حفظ كمسودة",
  publishNow: "نشر الآن",
  publishing: "جارٍ النشر...",
  saving: "جارٍ الحفظ...",
  cancel: "إلغاء",
  save: "حفظ",
  delete: "حذف",
  edit: "تعديل",
  create: "إنشاء",
  search: "بحث",
  filter: "تصفية",
  refresh: "تحديث",
  loading: "جارٍ التحميل...",
  error: "حدث خطأ",
  success: "نجح",
  required: "مطلوب",
  optional: "اختياري",
  signInRequired: "تسجيل الدخول مطلوب",
  accessRestricted: "الوصول مقيّد",
  adminRequired: "تحتاج إلى صلاحيات المسؤول لعرض هذه الصفحة.",
  home: "الرئيسية",
  livePolls: "استطلاعات مباشرة",
  votesCast: "صوت مُدلى به",
  voteDirectly: "صوّت مباشرةً — صوت واحد لكل استطلاع، مجهول الهوية",
  allPolls: "كل الاستطلاعات",
  leading: "في الصدارة:",
  seeAll: "رؤية الكل",
  haveAQuestion: "هل لديك سؤال للجزائر؟",
  submitPollCTA: "اقترح فكرة استطلاع وسيراجعها فريقنا التحريري.",
  liveOpinionAlgeria: "الرأي العام الجزائري مباشرةً",
  voteOnLivePolls: "التصويت على استطلاعات مباشرة",
  joinDiscussion: "المشاركة في النقاش المدني",
  oneVoteFair: "صوت واحد، يُحسب بعدل",
  createOneFree: "أنشئ حساباً — مجاناً",
  bySigningIn: "بتسجيل دخولك، فإنك توافق على",
  termsOfUse: "شروط الاستخدام",
  privacyPolicy: "سياسة الخصوصية",
  createDzPulseAccount: "أنشئ حسابك على DzPulse",
  joinAlgerianOpinion: "انضم إلى النقاش حول الرأي العام الجزائري",
  ageRange: "الفئة العمرية",
  optionalDetails: "تفاصيل اختيارية",
  wilayaOptional: "الولاية (اختياري)",
  showOptionalDetails: "عرض التفاصيل الاختيارية",
  hideOptionalDetails: "إخفاء التفاصيل الاختيارية",
  userNotFound: "المستخدم غير موجود.",
  pollsVoted: "استطلاعات تم التصويت عليها",
  pollsSuggested: "استطلاعات مقترحة",
  yourVotedPolls: "استطلاعاتك التي صوّت عليها",
  noPollsVotedYet: "لم تصوّت على أي استطلاع بعد. استكشف الاستطلاعات وشارك رأيك.",
  joined: "انضم",
  topicsPageTitle: "المواضيع",
  topicsPageDesc: "تصفّح الاستطلاعات حسب الموضوع",
  browseByTopic: "تصفّح حسب الموضوع",
  totalPolls: "استطلاعات",
  submitQuestion: "اقتراح سؤال",
  submitQuestionDesc: "لا تجد موضوعك؟ اقترح فكرة استطلاع.",
};

const TRANSLATIONS: Record<Lang, Translations> = { en: EN, fr: FR, ar: AR };

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: EN,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("dzpulse_lang") as Lang | null;
    return stored && ["en", "ar", "fr"].includes(stored) ? stored : "en";
  });

  const setLang = (l: Lang) => {
    localStorage.setItem("dzpulse_lang", l);
    setLangState(l);
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang], isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
