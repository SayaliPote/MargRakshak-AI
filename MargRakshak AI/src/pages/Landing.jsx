import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Bell,
  Users,
  BadgeCheck,
  Route,
  BarChart3,
  Smartphone,
  Database,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Apple,
  PlayCircle,
  ArrowUp,
  ArrowRight,
  Navigation,
  TriangleAlert,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/common/LanguageSelector';

const STAT_ICONS = [MapPin, Bell, Users, BadgeCheck];
const FEATURE_ICONS = [MapPin, Bell, Route, BarChart3];
const STEP_ICONS = [Smartphone, Database, Bell, ShieldCheck];

function getNavLinks(t) {
  return [
    { key: 'home', label: t('nav.home'), href: '#hero' },
    { key: 'about', label: t('nav.about'), href: '#about' },
    { key: 'features', label: t('nav.features'), href: '#features' },
    { key: 'howItWorks', label: t('nav.howItWorks'), href: '#how-it-works' },
    { key: 'hotspots', label: t('nav.hotspots'), href: '#stats' },
    { key: 'contact', label: t('nav.contact'), href: '#contact' },
  ];
}

function getFooterLinks(t, navigate) {
  return {
    [t('landing.footer.quickLinks')]: [
      { label: t('nav.home'), href: '#hero' },
      { label: t('nav.about'), href: '#about' },
      { label: t('nav.features'), href: '#features' },
      { label: t('nav.howItWorks'), href: '#how-it-works' },
      { label: t('nav.hotspots'), href: '#stats' },
      { label: t('nav.contact'), href: '#contact' },
    ],
    [t('landing.footer.forDrivers')]: [
      { label: t('landing.footer.driverLogin'), href: '/login' },
      { label: t('nav.howItWorks'), href: '#how-it-works' },
      { label: t('landing.footer.safetyTips'), href: '#features' },
      { label: t('landing.footer.faqs'), href: '#contact' },
    ],
    [t('landing.footer.forAdmin')]: [
      { label: t('landing.footer.adminLogin'), href: '/admin/login' },
      { label: t('landing.footer.dashboard'), href: '/admin/dashboard' },
      { label: t('landing.footer.hotspotManagement'), href: '/admin/hotspots' },
      { label: t('landing.footer.reports'), href: '/admin/reports' },
    ],
  };
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksRef = useRef(null);

  const NAV_LINKS = getNavLinks(t);
  const FOOTER_LINKS = getFooterLinks(t, navigate);
  const STATS = [
    { icon: STAT_ICONS[0], value: '2500+', label: t('landing.stats.hotspots') },
    { icon: STAT_ICONS[1], value: '1M+', label: t('landing.stats.alerts') },
    { icon: STAT_ICONS[2], value: '50K+', label: t('landing.stats.users') },
    { icon: STAT_ICONS[3], value: '100%', label: t('landing.stats.focused') },
  ];
  const FEATURE_ITEMS = t('landing.features.items').map((item, i) => ({
    ...item,
    icon: FEATURE_ICONS[i],
  }));
  const STEPS = t('landing.howItWorks.steps').map((step, i) => ({
    ...step,
    num: String(i + 1).padStart(2, '0'),
    icon: STEP_ICONS[i],
  }));

  const handleExploreFeatures = () => {
    setShowHowItWorks(true);
  };

  useEffect(() => {
    if (showHowItWorks && howItWorksRef.current) {
      howItWorksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showHowItWorks]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <a href="#hero" className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400 text-slate-900">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-extrabold tracking-tight text-slate-900">
                {t('common.appName')}
              </span>
              <span className="block text-[11px] text-slate-400 font-medium -mt-0.5">
                {t('common.tagline')}
              </span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.key}
                href={link.href}
                onClick={(e) => {
                  if (link.href === '#how-it-works') {
                    e.preventDefault();
                    handleExploreFeatures();
                  }
                }}
                className={`relative text-sm font-medium pb-1 transition-colors ${
                  i === 0
                    ? 'text-slate-900 border-b-2 border-amber-400'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <LanguageSelector variant="light" />
            <button
              onClick={() => navigate('/login')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm shadow-amber-400/30"
            >
              {t('nav.loginSignup')}
            </button>
          </div>

          <button
            className="lg:hidden text-slate-700"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-slate-100 px-5 py-4 space-y-3 bg-white">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                onClick={(e) => {
                  setMenuOpen(false);
                  if (link.href === '#how-it-works') {
                    e.preventDefault();
                    handleExploreFeatures();
                  }
                }}
                className="block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2">
              <LanguageSelector variant="light" />
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/login');
              }}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              {t('nav.loginSignup')}
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="hero" className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/2788548/pexels-photo-2788548.jpeg?auto=compress&cs=tinysrgb&w=1600')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-5 md:px-8 pt-16 pb-12 sm:pt-20 md:pt-28 md:pb-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              {t('landing.hero.title1')}<br />{t('landing.hero.title2')}
            </h1>
            <p className="mt-5 text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
              {t('landing.hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                {t('landing.hero.driverCta')}
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl border border-white/30 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {t('landing.hero.adminCta')}
              </button>
            </div>
          </div>

          <div id="stats" className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/15 text-amber-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-white font-bold text-lg leading-none">{value}</div>
                  <div className="text-slate-400 text-xs mt-1.5 leading-snug">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY MARGRAKSHAK / FEATURES */}
      <section id="features" className="bg-white pt-20 md:pt-24 pb-10 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8">
          <div id="about" className="text-center max-w-2xl mx-auto">
            <span className="text-amber-500 text-xs font-bold tracking-wide">{t('landing.features.eyebrow')}</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
              {t('landing.features.title')}
            </h2>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURE_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 p-7 text-center hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-500 mb-5">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="font-bold text-slate-900 text-base leading-snug">{title}</h3>
                <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleExploreFeatures}
              className="inline-flex items-center gap-2 border-2 border-amber-400 text-amber-500 hover:bg-amber-400 hover:text-slate-900 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
            >
              {t('landing.features.exploreAll')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — hidden until "Explore All Features" is clicked */}
      {showHowItWorks && (
        <section id="how-it-works" ref={howItWorksRef} className="bg-slate-50 pt-10 md:pt-14 pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-amber-500 text-xs font-bold tracking-wide">{t('landing.howItWorks.eyebrow')}</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
              {t('landing.howItWorks.title')}
            </h2>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6 relative">
            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <div key={num} className="relative text-center px-2">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.75rem)] w-[calc(100%-5.5rem)] border-t-2 border-dashed border-amber-200" />
                )}
                <span className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-amber-100 text-amber-500 shadow-sm">
                  <Icon className="w-6 h-6" />
                </span>
                <div className="mt-4 text-amber-500 font-bold text-sm">{num}</div>
                <h3 className="mt-1 font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-[220px] mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA BANNER */}
      <section className="bg-white pb-16 sm:pb-20 md:pb-24 px-4 sm:px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-8 py-12 md:px-14 md:py-0 md:h-80 flex flex-col md:flex-row items-center gap-10">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                color: 'white',
              }}
            />
            <div className="relative flex-1 text-center md:text-left">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white">
                {t('landing.cta.title')}
              </h2>
              <p className="mt-3 text-slate-400 text-sm md:text-base max-w-md mx-auto md:mx-0">
                {t('landing.cta.subtitle')}
              </p>
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                <button
                  onClick={() => navigate('/user/navigation')}
                  className="inline-flex items-center gap-2 border border-white/25 hover:bg-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] text-slate-400">{t('landing.cta.getItOn')}</span>
                    <span className="block font-semibold">{t('landing.cta.googlePlay')}</span>
                  </span>
                </button>
                <button
                  onClick={() => navigate('/user/navigation')}
                  className="inline-flex items-center gap-2 border border-white/25 hover:bg-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Apple className="w-5 h-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] text-slate-400">{t('landing.cta.downloadOn')}</span>
                    <span className="block font-semibold">{t('landing.cta.appStore')}</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="relative shrink-0 hidden sm:block">
              <div className="w-40 h-72 rounded-[2rem] bg-slate-900 border-4 border-slate-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-700 rounded-b-lg" />
                <div className="absolute inset-1.5 top-5 rounded-[1.4rem] bg-gradient-to-b from-slate-200 to-slate-300 overflow-hidden">
                  <svg viewBox="0 0 140 240" className="w-full h-full">
                    <rect width="140" height="240" fill="#dfe4ea" />
                    <path d="M0 60 Q 70 90 60 150 T 140 200" stroke="#fff" strokeWidth="10" fill="none" />
                    <path d="M0 60 Q 70 90 60 150 T 140 200" stroke="#f4b93f" strokeWidth="3" strokeDasharray="6 6" fill="none" />
                    <circle cx="60" cy="150" r="6" fill="#dc2626" />
                  </svg>
                  <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-red-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 rounded-lg px-2.5 py-2 flex items-center gap-2">
                    <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-white text-[11px] font-semibold leading-tight">
                      500 m<br /><span className="font-normal text-slate-400">{t('landing.cta.phoneAlertLabel')}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-slate-950 text-slate-400 pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] gap-8 sm:gap-10 pb-10 sm:pb-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400 text-slate-900">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <span className="leading-tight">
                <span className="block font-display font-extrabold text-white">{t('common.appName')}</span>
                <span className="block text-[10px] text-slate-500">{t('common.tagline')}</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              {t('landing.footer.desc')}
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#hero"
                  className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:bg-amber-400 hover:text-slate-900 hover:border-amber-400 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-white font-semibold text-sm mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a href={link.href} className="text-sm hover:text-amber-400 transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => navigate(link.href, link.state ? { state: link.state } : undefined)}
                        className="text-sm hover:text-amber-400 transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('landing.footer.contactUs')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                {t('landing.footer.address')}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-amber-400" />
                +91 12345 67890
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-amber-400" />
                info@margrakshak.in
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>{t('landing.footer.copyright')}</span>
            <span className="flex items-center gap-3">
              <a href="#hero" className="hover:text-amber-400 transition-colors">{t('landing.footer.privacyPolicy')}</a>
              <span className="text-slate-700">|</span>
              <a href="#hero" className="hover:text-amber-400 transition-colors">{t('landing.footer.terms')}</a>
            </span>
            <button
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 flex items-center justify-center transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
