import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Award, 
  Play, 
  ArrowRight, 
  Star, 
  CheckCircle,
  Zap,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';

const stats = [
  { value: '2,500+', label: 'Etudiants actifs' },
  { value: '150+', label: 'Enseignants qualifies' },
  { value: '50+', label: 'Formations' },
  { value: '95%', label: 'Taux de reussite' },
];

const features = [
  { icon: Zap, title: 'Apprentissage rapide', desc: 'Accedez a vos cours nimporte ou, nimporte quand.' },
  { icon: Shield, title: 'Securise', desc: 'Vos donnees sont protegees avec les dernieres technologies.' },
  { icon: Clock, title: 'Flexible', desc: 'Apprenez a votre rythme avec des horaires flexibles.' },
  { icon: TrendingUp, title: 'Progressez', desc: 'Suivez votre progression en temps reel.' },
];

const courses = [
  { id: 1, title: 'Developpement Web Full Stack', category: 'Informatique', students: 1250, rating: 4.9, price: '450,000 FCFA', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400' },
  { id: 2, title: 'Gestion de Projet Agile', category: 'Gestion', students: 890, rating: 4.8, price: '350,000 FCFA', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400' },
  { id: 3, title: 'Droit des Affaires', category: 'Droit', students: 650, rating: 4.7, price: '400,000 FCFA', image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400' },
  { id: 4, title: 'Marketing Digital', category: 'Marketing', students: 1100, rating: 4.9, price: '380,000 FCFA', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
];

const testimonials = [
  { id: 1, name: 'Kouame Yao', role: 'Etudiant en Informatique', text: 'CampusLMS a transforme ma facon dapprendre. Les cours sont bien structures et les enseignants sont disponibles.', avatar: null },
  { id: 2, name: 'Aicha Diallo', role: 'Etudiante en Gestion', text: 'La plateforme est intuitive et moderne. Je peux suivre mes cours depuis mon telephone sans probleme.', avatar: null },
  { id: 3, name: 'Jean Koffi', role: 'Etudiant en Droit', text: 'Les outils de suivi de progression maident a rester motive. Je recommande vivement CampusLMS.', avatar: null },
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 py-20 lg:py-32">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm mb-6">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                Nouveau : Formation en Intelligence Artificielle
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Apprenez. Evoluez.
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Reussissez.</span>
              </h1>
              
              <p className="text-lg text-gray-300 mb-8 max-w-lg">
                Rejoignez des milliers detudiants qui transforment leur avenir avec CampusLMS, la plateforme de gestion universitaire leader en Cote dIvoire.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all"
                >
                  Commencer maintenant
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-white/20 transition-all">
                  <Play className="h-5 w-5" />
                  Voir la video
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-12 border-t border-white/10">
                {stats.map((stat, idx) => (
                  <div key={idx}>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600" 
                  alt="Students"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">+500 inscriptions</p>
                      <p className="text-sm text-gray-500">ce mois-ci</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <img key={i} src={`https://ui-avatars.com/api/?name=User${i}&background=random`} className="h-8 w-8 rounded-full border-2 border-white" alt="" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">+2.5k etudiants</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir CampusLMS ?
            </h2>
            <p className="text-gray-600">
              Une plateforme complete concue pour repondre aux besoins des etablissements denseignement modernes.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-shadow group">
                <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Formations populaires
              </h2>
              <p className="text-gray-600">Decouvrez nos formations les plus demandees</p>
            </div>
            <Link to="#" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700">
              Voir toutes les formations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-sm font-medium rounded-lg">
                      {course.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      {course.rating}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-lg font-bold text-blue-600">{course.price}</span>
                    <button className="text-sm font-medium text-gray-600 hover:text-blue-600">
                      En savoir plus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Pret a transformer votre avenir ?
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Rejoignez des milliers detudiants qui ont choisi CampusLMS pour leur formation. Inscrivez-vous des aujourdhui et commencez votre parcours vers le succes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Sinscrire gratuitement
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                to="#" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
              >
                Contacter un conseiller
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Ce que disent nos etudiants
            </h2>
            <p className="text-gray-600">
              Decouvrez les temoignages de ceux qui ont choisi CampusLMS.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">{testimonial.text}</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`} 
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 lg:p-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Restez informe
              </h2>
              <p className="text-gray-400 mb-8">
                Inscrivez-vous a notre newsletter pour recevoir les dernieres actualites et offres.
              </p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  Sabonner
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
