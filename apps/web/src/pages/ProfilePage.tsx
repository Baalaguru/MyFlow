import { Button } from '../components/ui'
import type { TranslationKey } from '../i18n'
import type { RouteId } from '../lib/routes'

interface ProfilePageProps {
  t: (key: TranslationKey) => string
  onNavigate: (route: RouteId) => void
}

export function ProfilePage({ t, onNavigate }: ProfilePageProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t('appTitle')}</p>
        <h1 className="text-3xl md:text-4xl">{t('profileTitle')}</h1>
        <p className="muted mt-2 text-sm italic">{t('profileSubtitle')}</p>
      </header>

      <section className="panel space-y-4 p-6">
        <p>{t('profileSingleNote')}</p>
        <p className="muted text-sm">{t('profileEditLater')}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => onNavigate('appearance')}>
            {t('openAppearance')}
          </Button>
        </div>
      </section>

      <section className="panel p-6">
        <p className="eyebrow">{t('profilePreferences')}</p>
        <p className="muted mt-2 text-sm">{t('settingsSubtitle')}</p>
      </section>
    </div>
  )
}
