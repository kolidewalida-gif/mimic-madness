import { LegalLayout, LegalSection } from '@/components/LegalLayout';
import { CONTACT_EMAIL, PUBLISHER_NAME, SITE_URL } from '@/lib/legal';

const MentionsLegales = () => (
  <LegalLayout
    title="Mentions légales"
    description="Éditeur, hébergement, contact et propriété intellectuelle du site Mimic Master."
  >
    <LegalSection heading="Éditeur">
      <p>
        {PUBLISHER_NAME} — projet indépendant édité par un particulier.
        <br />
        Contact :{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        Adresse du site :{' '}
        <a className="underline" href={SITE_URL}>{SITE_URL}</a>
      </p>
    </LegalSection>

    <LegalSection heading="Hébergement">
      <p>
        Le site est déployé et diffusé par Lovable, avec distribution assurée par
        Cloudflare. Les données de compte, de progression et de paiement sont
        hébergées par Supabase, dans l'Union européenne.
      </p>
    </LegalSection>

    <LegalSection heading="Paiements">
      <p>
        Les offres de soutien sont encaissées par Paddle, qui agit en qualité de
        vendeur officiel et émet la facture correspondante.
      </p>
    </LegalSection>

    <LegalSection heading="Propriété intellectuelle">
      <p>
        Le nom {PUBLISHER_NAME}, l'interface, les visuels et les textes de ce site
        sont protégés. Toute reproduction ou réutilisation sans autorisation est
        interdite. Les marques et contenus cités appartiennent à leurs détenteurs
        respectifs.
      </p>
    </LegalSection>

    <LegalSection heading="Contenus des joueurs">
      <p>
        Les enregistrements audio et vidéo échangés en partie restent la propriété
        de leurs auteurs. Si un contenu te concerne et te semble diffusé à tort,
        signale-le à{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
        pour retrait.
      </p>
    </LegalSection>

    <LegalSection heading="Données personnelles">
      <p>
        Le traitement des données et l'usage des cookies publicitaires sont
        détaillés dans la politique de confidentialité.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default MentionsLegales;
