import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useGetDetectedLocale, useRecordAnalyticsEvent, useSubmitWaitlistSignup } from '@workspace/api-client-react';
import type { WaitlistSignupInput } from '@workspace/api-client-react';
import { getAlpha2Codes, getNames, registerLocale } from 'i18n-iso-countries';
import enCountries from 'i18n-iso-countries/langs/en.json';
import plCountries from 'i18n-iso-countries/langs/pl.json';
import arCountries from 'i18n-iso-countries/langs/ar.json';
import { ArrowDownRight, ArrowRight, Check } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

registerLocale(enCountries);
registerLocale(plCountries);
registerLocale(arCountries);

function localizedCountries(locale: Locale): Array<[string, string]> {
  const names = getNames(locale, { select: 'official' });
  const collator = new Intl.Collator(locale);
  return Object.keys(getAlpha2Codes())
    .filter((code) => /^[A-Z]{2}$/.test(code) && names[code])
    .map((code) => [code, names[code] ?? code] as [string, string])
    .sort((a, b) => collator.compare(a[1], b[1]));
}

function createAnonymousId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

function Home() {
  const { data: detected } = useGetDetectedLocale();
  const analytics = useRecordAnalyticsEvent();
  const [locale, setLocale] = useState<'en' | 'pl' | 'ar'>(() => {
    const saved = localStorage.getItem('loqelo-locale');
    return saved === 'pl' || saved === 'ar' ? saved : 'en';
  });
  const [manualLocale, setManualLocale] = useState(() => localStorage.getItem('loqelo-locale') !== null);
  const [country, setCountry] = useState(() => localStorage.getItem('loqelo-country') || '');
  const [analyticsChoice, setAnalyticsChoice] = useState(() => localStorage.getItem('loqelo-analytics') || '');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const anonymousId = useRef<string | null>(null);
  const pageViewSent = useRef(false);
  const getAnonymousId = () => {
    if (anonymousId.current) return anonymousId.current;
    const saved = localStorage.getItem('loqelo-anonymous-id');
    anonymousId.current = saved || createAnonymousId();
    localStorage.setItem('loqelo-anonymous-id', anonymousId.current);
    return anonymousId.current;
  };
  useEffect(() => {
    if (detected && !manualLocale) {
      setLocale(detected.locale);
      if (detected.countryCode) setCountry(detected.countryCode);
    }
  }, [detected, manualLocale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  useEffect(() => {
    if (analyticsChoice !== 'yes' || pageViewSent.current) return;
    pageViewSent.current = true;
    analytics.mutate({ data: { anonymousId: getAnonymousId(), eventType: 'page_view', countryCode: country || detected?.countryCode || null, locale } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsChoice === 'yes']);
  const changeCountry = (code: string) => {
    setCountry(code);
    localStorage.setItem('loqelo-country', code);
  };
  const setConsent = (allow: boolean) => {
    const value = allow ? 'yes' : 'no';
    setAnalyticsChoice(value);
    localStorage.setItem('loqelo-analytics', value);
    if (!allow) {
      localStorage.removeItem('loqelo-anonymous-id');
      anonymousId.current = null;
      pageViewSent.current = false;
    }
    setShowAnalytics(false);
  };
  const onSignupSuccess = (audience: 'customer' | 'provider', isNewSignup: boolean) => {
    if (analyticsChoice === 'yes' && isNewSignup) {
      analytics.mutate({ data: { anonymousId: getAnonymousId(), eventType: 'waitlist_signup', countryCode: country || detected?.countryCode || null, audience, locale } });
    }
  };
  const t = copy[locale];
  const countryCode = country || detected?.countryCode || '';
  const countryOptions = localizedCountries(locale);
  return (
    <div className="site">
      <header className="wrap nav">
        <a href="#top" className="brand" aria-label="Loqelo home" data-testid="link-home"><img src="/assets/loqelo-logo.webp" alt="Loqelo" width="2398" height="610" fetchPriority="high" /></a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#how">{t.navHow}</a><a href="#product">{t.navProduct}</a><a href="#join">{t.navJoin}</a>
        </nav>
        <div className="nav-actions">
          <label className="sr-only" htmlFor="site-language">Language</label>
          <select id="site-language" className="lang-select" value={locale} onChange={(e) => { const nextLocale = e.target.value as 'en' | 'pl' | 'ar'; setLocale(nextLocale); localStorage.setItem('loqelo-locale', nextLocale); setManualLocale(true); }} data-testid="select-language" aria-label="Choose language">
            <option value="en">EN</option><option value="pl">PL</option><option value="ar">عربي</option>
          </select>
          <a className="btn" href="#join" data-testid="link-join">{t.joinButton} <ArrowRight size={15} /></a>
        </div>
      </header>
      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy-block">
              <div className="eyebrow">{t.heroEyebrow}</div>
              <h1>{t.heroLine1}<br /><em>{t.heroLine2}</em></h1>
              <p className="hero-copy">{t.heroBody}</p>
              <div className="hero-ctas">
                <a href="#join-customer" className="btn">{t.customerCta}<ArrowRight size={15} /></a>
                <a href="#join-provider" className="btn outline">{t.providerCta}<ArrowDownRight size={15} /></a>
              </div>
              <div className="launch-line"><span className="launch-dot" />{t.launch}<strong>February 2027</strong></div>
            </div>
            <div className="hero-visual">
              <span className="hero-index">LOQELO / 2027</span>
              <div className="hero-photo"><img src="/assets/home-services.jpg" alt="Home service professionals at work" width="1400" height="2100" fetchPriority="high" /></div>
              <div className="floating-note"><small>{t.heroNote}</small><strong>{t.heroNoteTitle}</strong><span>{t.heroNoteSub}</span></div>
            </div>
          </div>
        </section>
        <section className="video-row" id="film">
          <div className="wrap">
            <div className="section-head">
              <div><div className="eyebrow">{t.filmLabel}</div><h2>{t.filmTitle}</h2></div>
              <p>{t.filmBody}</p>
            </div>
            <div className="video-frame">
              <video controls playsInline preload="none" poster="/assets/home-services.jpg" aria-label="Loqelo promo film">
                <source src="/api/storage/public-objects/loqelo/promo-v1.mp4" type="video/mp4" />
                {t.videoFallback}
              </video>
              <div className="video-caption">{t.filmCaption}</div>
            </div>
          </div>
        </section>
        <section className="product-section" id="product">
          <div className="wrap">
            <div className="section-head">
              <div><div className="eyebrow">{t.productLabel}</div><h2>{t.productTitle}</h2></div>
              <p>{t.productBody}</p>
            </div>
            <div className="product-grid">
              <div className="product-card main"><div className="product-label"><span>{t.productHome}</span><strong>01 / 04</strong></div><img src="/assets/platform-home.webp" alt="Loqelo marketplace homepage interface" width="1440" height="3054" loading="lazy" /></div>
              <div className="product-card quote"><div className="product-label"><span>{t.productQuotes}</span><strong>02 / 04</strong></div><img src="/assets/customer-quotes.webp" alt="Customer comparing service quotes in Loqelo" width="1440" height="1804" loading="lazy" /></div>
              <div className="product-card mobile"><div className="product-label"><span>{t.productMobile}</span><strong>03 / 04</strong></div><img src="/assets/mobile-home.webp" alt="Loqelo mobile service request experience" width="390" height="844" loading="lazy" /></div>
              <div className="product-card bid"><div className="product-label"><span>{t.productBid}</span><strong>04 / 04</strong></div><img src="/assets/provider-bid.webp" alt="A service professional preparing an offer in Loqelo" width="1440" height="1781" loading="lazy" /></div>
            </div>
          </div>
        </section>
        <section className="flow" id="how">
          <div className="wrap">
            <div className="flow-top">
              <div><div className="eyebrow">{t.flowLabel}</div><h2>{t.flowTitle}</h2></div>
              <p>{t.flowBody}</p>
            </div>
            <div className="steps">
              {[t.step1, t.step2, t.step3, t.step4].map((step, i) => <article className="step" key={step.title}>
                <div className="step-no">0{i + 1}</div><h3>{step.title}</h3><p>{step.body}</p>
              </article>)}
            </div>
          </div>
        </section>
        <section className="matching">
          <div className="wrap matching-grid">
            <div className="match-art"><img src="/assets/provider-dashboard.webp" alt="Provider dashboard showing nearby matched jobs" width="1440" height="1024" loading="lazy" /><div className="match-sticker">{t.matchSticker}</div></div>
            <div>
              <div className="eyebrow">{t.matchLabel}</div><h2>{t.matchTitle}</h2><p>{t.matchBody}</p>
              <ul className="match-list">{t.matchPoints.map((point, i) => <li key={point}><span>0{i + 1}</span>{point}</li>)}</ul>
            </div>
          </div>
        </section>
        <section className="signup" id="join">
          <div className="wrap">
            <div className="signup-intro"><div><div className="eyebrow">{t.joinEyebrow}</div><h2>{t.joinTitle}</h2></div><p>{t.joinBody}</p></div>
            <div className="forms-grid">
              <WaitlistForm audience="customer" locale={locale} countryCode={countryCode} countries={countryOptions} onCountryChange={changeCountry} onSuccess={onSignupSuccess} text={t} />
              <WaitlistForm audience="provider" locale={locale} countryCode={countryCode} countries={countryOptions} onCountryChange={changeCountry} onSuccess={onSignupSuccess} text={t} />
            </div>
          </div>
        </section>
      </main>
      <footer className="footer"><div className="wrap footer-inner">
        <a href="#top" className="brand" aria-label="Loqelo home"><img src="/assets/loqelo-logo.webp" alt="Loqelo" width="2398" height="610" loading="lazy" /></a>
        <div className="footer-links"><a href="#how">{t.navHow}</a><a href="#product">{t.navProduct}</a><a href="#join">{t.navJoin}</a><button className="privacy-link" onClick={() => setShowAnalytics(true)} data-testid="button-privacy-preferences">{t.privacy}</button></div>
        <small>© 2026 Loqelo · {t.footerNote}</small>
      </div></footer>
      {(!analyticsChoice || showAnalytics) && <aside className="cookie-banner" aria-label="Analytics preferences">
        <strong>{t.cookieTitle}</strong><p>{t.cookieBody}</p>
        <div className="cookie-actions"><button className="accept" onClick={() => setConsent(true)} data-testid="button-analytics-accept">{t.allowAnalytics}</button><button onClick={() => setConsent(false)} data-testid="button-analytics-reject">{t.essentialOnly}</button></div>
      </aside>}
    </div>
  );
}

type Locale = 'en' | 'pl' | 'ar';
type Copy = typeof copy[keyof typeof copy];
function WaitlistForm({ audience, locale, countryCode, countries, onCountryChange, onSuccess, text }: {
  audience: 'customer' | 'provider'; locale: Locale; countryCode: string;
  countries: Array<[string, string]>;
  onCountryChange: (code: string) => void; onSuccess: (audience: 'customer' | 'provider', isNewSignup: boolean) => void; text: Copy;
}) {
  const signup = useSubmitWaitlistSignup();
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'business' | ''>('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'joined' | 'already_joined' | 'error' | null>(null);
  const title = audience === 'customer' ? text.customerTitle : text.providerTitle;
  const description = audience === 'customer' ? text.customerDescription : text.providerDescription;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    const data: WaitlistSignupInput = {
      email: email.trim(), audience, countryCode, locale, consent: true, website,
      ...(accountType ? { accountType } : {}),
    };
    signup.mutate({ data }, {
      onSuccess: (result) => {
        setStatus(result.result);
        onSuccess(audience, result.result === 'joined');
      },
      onError: () => setStatus('error'),
    });
  };
  return <form className={`form-card ${audience}`} id={audience === 'customer' ? 'join-customer' : 'join-provider'} onSubmit={submit}>
    <div className="form-kicker">{audience === 'customer' ? text.forCustomers : text.forProviders}</div>
    <h3>{title}</h3><p>{description}</p>
    <div className="field"><label htmlFor={`${audience}-email`}>{text.emailLabel}</label><input id={`${audience}-email`} type="email" autoComplete="email" required maxLength={254} placeholder={text.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} data-testid={`input-${audience}-email`} /></div>
    <div className="form-row">
      <div className="field"><label htmlFor={`${audience}-country`}>{text.countryLabel}</label><select id={`${audience}-country`} required value={countryCode} onChange={(e) => onCountryChange(e.target.value)} data-testid={`select-${audience}-country`}><option value="" disabled>{text.countryPlaceholder}</option>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
      <div className="field"><label htmlFor={`${audience}-type`}>{text.accountTypeLabel}</label><select id={`${audience}-type`} value={accountType} onChange={(e) => setAccountType(e.target.value as 'individual' | 'business' | '')} data-testid={`select-${audience}-type`}><option value="">{text.optional}</option><option value="individual">{text.individual}</option><option value="business">{text.business}</option></select></div>
    </div>
    <div className="honeypot" aria-hidden="true"><label htmlFor={`${audience}-website`}>Website</label><input id={`${audience}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
    <label className="consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid={`checkbox-${audience}-consent`} /><span>{text.consent}</span></label>
    <button type="submit" className="btn form-submit" disabled={signup.isPending} data-testid={`button-submit-${audience}`}>{signup.isPending ? text.submitting : audience === 'customer' ? text.customerSubmit : text.providerSubmit}{!signup.isPending && <ArrowRight size={15} />}</button>
    {status && <div className={`form-status ${status === 'error' ? 'error' : ''}`} role="status" data-testid={`status-${audience}-signup`}>
      {status === 'joined' ? <><Check size={15} /> {text.success}</> : status === 'already_joined' ? text.already : text.error}
    </div>}
  </form>;
}

const copy = {
  en: {
    navHow: 'How it works', navProduct: 'The platform', navJoin: 'Join the list', joinButton: 'Get early access',
    heroEyebrow: 'The place for every place', heroLine1: 'Everything your', heroLine2: 'place needs.',
    heroBody: 'From the first small fix to the jobs that keep a business moving. Meet the right local professional, with less guesswork and more good work.',
    customerCta: 'I need a professional', providerCta: 'I am a professional', launch: 'Launching globally ·', heroNote: 'GOOD PEOPLE, RIGHT HERE', heroNoteTitle: 'Your place, in good hands.', heroNoteSub: 'Made for homes, gardens & workspaces',
    filmLabel: 'A closer look', filmTitle: 'Good work starts with a clear ask.', filmBody: 'See how a simple description becomes a better way to find, compare and choose local professionals.', filmCaption: 'Meet Loqelo — launching February 2027', videoFallback: 'Your browser does not support embedded video.',
    productLabel: 'A real product, taking shape', productTitle: 'Made for the way work really happens.', productBody: 'A glimpse at the Loqelo experience: a clear request on one side, confident offers from local pros on the other.', productHome: 'A clearer way to ask', productQuotes: 'Compare with confidence', productMobile: 'Good on the go', productBid: 'A thoughtful offer',
    flowLabel: 'One straightforward flow', flowTitle: 'From “I need…” to “it’s done.”', flowBody: 'No cold calls. No endless searching. Describe what you need once, then let the right local professionals come back with their offers.',
    step1: { title: 'Describe your need', body: 'Tell us what needs doing, where and when. A sentence is enough to start.' }, step2: { title: 'We find the services', body: 'Your request reaches relevant professionals in your area, not a generic directory.' }, step3: { title: 'Receive offers', body: 'Compare price, timing and provider details side by side, all in one place.' }, step4: { title: 'Choose your pro', body: 'Pick the person or business that feels right. The decision stays yours.' },
    matchLabel: 'Better matches, by design', matchTitle: 'The right job. The right local pro.', matchBody: 'Loqelo brings the request and the professional closer together. Customers get relevant responses; service pros see nearby work that fits what they do.',
    matchPoints: ['Your request is matched by service and location.', 'Professionals see the details before they decide to respond.', 'Compare offers and choose without pressure.'], matchSticker: 'LOCAL\\nMEETS\\nRELEVANT',
    joinEyebrow: 'Be here from the beginning', joinTitle: 'A better way to get things done is on its way.', joinBody: 'Loqelo launches in February 2027. Join the list for launch news and occasional product updates. No noise, just the useful bits.',
    forCustomers: 'For customers', forProviders: 'For professionals', customerTitle: 'Find your people.', providerTitle: 'Meet your next customer.',
    customerDescription: 'Get a first look when Loqelo opens in your country.', providerDescription: 'Be among the first local pros customers can find.',
    emailLabel: 'Email address', emailPlaceholder: 'you@example.com', countryLabel: 'Country', countryPlaceholder: 'Choose your country',
    accountTypeLabel: 'Joining as', optional: 'Optional', individual: 'Individual', business: 'Business',
    consent: 'I agree to receive launch news and occasional Loqelo updates by email. I can unsubscribe at any time.',
    customerSubmit: 'Join the customer list', providerSubmit: 'Join the professional list', submitting: 'Joining…',
    success: 'You’re on the list. We’ll be in touch when Loqelo is ready to launch.', already: 'You’re already signed up. We’ll keep you posted.', error: 'We couldn’t complete that just now. Please check your details and try again.',
    cookieTitle: 'Your privacy, your call.', cookieBody: 'We use essential storage to remember your language and this choice. With your permission, we also send anonymous page and completed-sign-up events to improve Loqelo. Analytics never includes your email or form content.',
    allowAnalytics: 'Allow anonymous analytics', essentialOnly: 'Essential only', footerNote: 'Everything your place needs.', privacy: 'Privacy choices',
  },
  pl: {
    navHow: 'Jak to działa', navProduct: 'Platforma', navJoin: 'Dołącz do listy', joinButton: 'Wczesny dostęp',
    heroEyebrow: 'Jedno miejsce dla każdego miejsca', heroLine1: 'Wszystko, czego', heroLine2: 'potrzebuje Twoje miejsce.',
    heroBody: 'Od drobnych napraw po usługi, które pomagają firmom działać. Znajdź właściwego lokalnego fachowca — bez zgadywania, z większą pewnością.',
    customerCta: 'Szukam fachowca', providerCta: 'Jestem fachowcem', launch: 'Globalna premiera ·', heroNote: 'DOBRZY FACHOWCY BLISKO CIEBIE', heroNoteTitle: 'Twoje miejsce w dobrych rękach.', heroNoteSub: 'Dla domu, ogrodu i biura',
    filmLabel: 'Zobacz bliżej', filmTitle: 'Dobra praca zaczyna się od jasnej potrzeby.', filmBody: 'Zobacz, jak prosty opis pomaga znaleźć, porównać i wybrać lokalnych fachowców.', filmCaption: 'Poznaj Loqelo — premiera w lutym 2027', videoFallback: 'Twoja przeglądarka nie obsługuje osadzonego wideo.',
    productLabel: 'Prawdziwy produkt w budowie', productTitle: 'Stworzone z myślą o codziennej pracy.', productBody: 'Zajrzyj do Loqelo: jasne zlecenie po jednej stronie, konkretne oferty lokalnych fachowców po drugiej.', productHome: 'Prostsze zlecenie', productQuotes: 'Porównuj i wybieraj', productMobile: 'Wygodnie w telefonie', productBid: 'Oferta z pomysłem',
    flowLabel: 'Prosty proces', flowTitle: 'Od „potrzebuję…” do „gotowe”.', flowBody: 'Bez zimnych telefonów i żmudnego szukania. Opisz potrzebę raz, a odpowiedni lokalni fachowcy przedstawią swoje oferty.',
    step1: { title: 'Opisz, czego potrzebujesz', body: 'Napisz, co trzeba zrobić, gdzie i kiedy. Wystarczy jedno zdanie.' }, step2: { title: 'Znajdziemy fachowców', body: 'Twoje zlecenie trafi do odpowiednich specjalistów w okolicy.' }, step3: { title: 'Otrzymaj oferty', body: 'Porównaj ceny, terminy i szczegóły w jednym miejscu.' }, step4: { title: 'Wybierz fachowca', body: 'Zdecyduj, z kim chcesz współpracować. Wybór należy do Ciebie.' },
    matchLabel: 'Dopasowanie ma znaczenie', matchTitle: 'Właściwe zlecenie. Lokalny fachowiec.', matchBody: 'Loqelo łączy potrzeby klientów z odpowiednimi specjalistami. Klienci otrzymują trafne odpowiedzi, a fachowcy widzą zlecenia, które pasują do ich pracy.',
    matchPoints: ['Zlecenia dopasowujemy według usługi i lokalizacji.', 'Fachowcy znają szczegóły przed odpowiedzią.', 'Porównujesz oferty i wybierasz bez presji.'], matchSticker: 'LOKALNIE\\nI TRAFNIE',
    joinEyebrow: 'Dołącz od samego początku', joinTitle: 'Lepszy sposób na codzienne sprawy już wkrótce.', joinBody: 'Loqelo wystartuje w lutym 2027. Zapisz się, aby otrzymać wiadomość o premierze i ważne informacje o produkcie.',
    forCustomers: 'Dla klientów', forProviders: 'Dla fachowców', customerTitle: 'Znajdź właściwą osobę.', providerTitle: 'Poznaj nowych klientów.',
    customerDescription: 'Dowiedz się jako pierwszy, gdy Loqelo ruszy w Twoim kraju.', providerDescription: 'Dołącz do lokalnych fachowców dostępnych w Loqelo.',
    emailLabel: 'Adres e-mail', emailPlaceholder: 'ty@example.com', countryLabel: 'Kraj', countryPlaceholder: 'Wybierz kraj',
    accountTypeLabel: 'Zapisuję się jako', optional: 'Opcjonalnie', individual: 'Osoba prywatna', business: 'Firma',
    consent: 'Wyrażam zgodę na e-maile o premierze i okazjonalne aktualizacje Loqelo. Mogę zrezygnować w dowolnym momencie.',
    customerSubmit: 'Dołącz do listy klientów', providerSubmit: 'Dołącz do listy fachowców', submitting: 'Zapisywanie…',
    success: 'Jesteś na liście. Napiszemy, gdy Loqelo będzie gotowe.', already: 'Jesteś już zapisany. Będziemy Cię informować.', error: 'Nie udało się teraz zapisać. Sprawdź dane i spróbuj ponownie.',
    cookieTitle: 'Ty decydujesz o prywatności.', cookieBody: 'Niezbędna pamięć przechowuje język i tę decyzję. Za Twoją zgodą wysyłamy anonimowe zdarzenia odwiedzin i udanych zapisów. Analityka nigdy nie zawiera adresu e-mail ani treści formularza.',
    allowAnalytics: 'Zgoda na anonimową analitykę', essentialOnly: 'Tylko niezbędne', footerNote: 'Wszystko, czego potrzebuje Twoje miejsce.', privacy: 'Ustawienia prywatności',
  },
  ar: {
    navHow: 'كيف يعمل', navProduct: 'المنصة', navJoin: 'انضم إلى القائمة', joinButton: 'احصل على وصول مبكر',
    heroEyebrow: 'مكان واحد لكل احتياجات المكان', heroLine1: 'كل ما يحتاجه', heroLine2: 'مكانك.',
    heroBody: 'من الإصلاحات الصغيرة إلى الخدمات التي تساعد الأعمال على الاستمرار. اعثر على المحترف المحلي المناسب، ببحث أقل وثقة أكبر.',
    customerCta: 'أبحث عن محترف', providerCta: 'أنا محترف', launch: 'الإطلاق عالمياً ·', heroNote: 'أشخاص جيدون بالقرب منك', heroNoteTitle: 'مكانك في أيدٍ أمينة.', heroNoteSub: 'للمنزل والحديقة ومساحات العمل',
    filmLabel: 'نظرة أقرب', filmTitle: 'العمل الجيد يبدأ بطلب واضح.', filmBody: 'شاهد كيف يتحول وصف بسيط إلى طريقة أفضل للعثور على المحترفين المحليين ومقارنتهم واختيارهم.', filmCaption: 'تعرّف على Loqelo — الإطلاق في فبراير 2027', videoFallback: 'متصفحك لا يدعم تشغيل الفيديو.',
    productLabel: 'منتج حقيقي قيد التطوير', productTitle: 'مصممة لطريقة إنجاز العمل فعلياً.', productBody: 'لمحة عن Loqelo: طلب واضح من جهة، وعروض واثقة من محترفين محليين من الجهة الأخرى.', productHome: 'طريقة أوضح للطلب', productQuotes: 'قارن بثقة', productMobile: 'سهلة أثناء التنقل', productBid: 'عرض مدروس',
    flowLabel: 'خطوات واضحة', flowTitle: 'من «أحتاج…» إلى «تمّ الأمر».', flowBody: 'لا مكالمات باردة ولا بحث طويل. اشرح ما تحتاجه مرة واحدة، ودع المحترفين المحليين المناسبين يرسلوا عروضهم.',
    step1: { title: 'صف ما تحتاجه', body: 'أخبرنا بما يجب إنجازه وأين ومتى. جملة واحدة تكفي للبدء.' }, step2: { title: 'نجد الخدمات المناسبة', body: 'يصل طلبك إلى محترفين مناسبين في منطقتك، لا إلى دليل عام.' }, step3: { title: 'استلم العروض', body: 'قارن الأسعار والمواعيد وتفاصيل مقدمي الخدمة في مكان واحد.' }, step4: { title: 'اختر المحترف', body: 'اختر الشخص أو الشركة المناسبة لك. القرار لك دائماً.' },
    matchLabel: 'مطابقة أفضل عن قصد', matchTitle: 'الطلب المناسب. والمحترف المحلي المناسب.', matchBody: 'تقرّب Loqelo بين احتياجات العملاء والمحترفين. يحصل العملاء على ردود مناسبة، ويرى المحترفون أعمالاً قريبة تناسب خبراتهم.',
    matchPoints: ['مطابقة الطلب حسب الخدمة والموقع.', 'يرى المحترفون التفاصيل قبل الرد.', 'قارن العروض واختر دون ضغط.'], matchSticker: 'محلي\\nومناسب',
    joinEyebrow: 'كن معنا منذ البداية', joinTitle: 'طريقة أفضل لإنجاز الأعمال قادمة قريباً.', joinBody: 'تنطلق Loqelo في فبراير 2027. انضم إلى القائمة لتصلك أخبار الإطلاق وتحديثات المنتج المهمة.',
    forCustomers: 'للعملاء', forProviders: 'للمحترفين', customerTitle: 'اعثر على من يناسبك.', providerTitle: 'تعرّف على عملائك القادمين.',
    customerDescription: 'كن أول من يعرف عند إطلاق Loqelo في بلدك.', providerDescription: 'كن من أوائل المحترفين المحليين الذين يعثر عليهم العملاء.',
    emailLabel: 'البريد الإلكتروني', emailPlaceholder: 'you@example.com', countryLabel: 'البلد', countryPlaceholder: 'اختر بلدك',
    accountTypeLabel: 'التسجيل بصفة', optional: 'اختياري', individual: 'فرد', business: 'شركة',
    consent: 'أوافق على تلقي أخبار الإطلاق وتحديثات Loqelo عبر البريد الإلكتروني. يمكنني إلغاء الاشتراك في أي وقت.',
    customerSubmit: 'انضم إلى قائمة العملاء', providerSubmit: 'انضم إلى قائمة المحترفين', submitting: 'جارٍ التسجيل…',
    success: 'أنت الآن في القائمة. سنتواصل معك عند جاهزية Loqelo.', already: 'أنت مسجل بالفعل. سنبقيك على اطلاع.', error: 'تعذر إكمال التسجيل الآن. تحقق من بياناتك وحاول مجدداً.',
    cookieTitle: 'خصوصيتك، اختيارك.', cookieBody: 'نستخدم التخزين الضروري لتذكر لغتك وهذا الاختيار. وبموافقتك، نرسل أحداثاً مجهولة لزيارة الصفحة واكتمال التسجيل لتحسين Loqelo. لا تتضمن التحليلات بريدك أو محتوى النموذج.',
    allowAnalytics: 'السماح بالتحليلات المجهولة', essentialOnly: 'الضروري فقط', footerNote: 'كل ما يحتاجه مكانك.', privacy: 'خيارات الخصوصية',
  },
} as const;

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
