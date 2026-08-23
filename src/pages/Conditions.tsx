import { LegalLayout, LegalSection } from '@/components/LegalLayout';
import {
  CONTACT_EMAIL,
  PRICE_AD_FREE_MONTHLY_LABEL,
  PRICE_SUPPORTER_LIFETIME_LABEL,
  PUBLISHER_NAME,
} from '@/lib/legal';

const Conditions = () => (
  <LegalLayout
    title="Conditions d'utilisation"
    description="Les règles d'accès au jeu, de comportement entre joueurs et de fonctionnement des offres de soutien."
  >
    <LegalSection heading="Objet">
      <p>
        Ces conditions encadrent l'accès à {PUBLISHER_NAME} et son utilisation.
        En créant un compte ou en rejoignant un salon, tu les acceptes.
      </p>
    </LegalSection>

    <LegalSection heading="Compte">
      <p>
        L'accès au jeu nécessite une connexion avec un compte Google. Tu es
        responsable de l'usage fait de ton compte et des contenus envoyés depuis
        celui-ci. Un seul compte par personne est attendu.
      </p>
    </LegalSection>

    <LegalSection heading="Règles de conduite">
      <p>Sont interdits, en partie comme dans le chat :</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>le harcèlement, les insultes et les propos haineux ou discriminatoires ;</li>
        <li>les contenus sexuels, violents ou illégaux ;</li>
        <li>l'envoi d'enregistrements mettant en scène une personne sans son accord ;</li>
        <li>la triche, l'automatisation et l'exploitation de failles ;</li>
        <li>toute tentative de perturber le service ou d'accéder aux données d'autrui.</li>
      </ul>
      <p>
        Le non-respect de ces règles peut entraîner l'exclusion d'un salon ou la
        suspension du compte, sans remboursement en cas d'abus caractérisé.
      </p>
    </LegalSection>

    <LegalSection heading="Contenus que tu envoies">
      <p>
        Certains modes reposent sur des enregistrements audio ou vidéo. Tu
        conserves tes droits sur ces contenus. En les envoyant, tu autorises leur
        diffusion aux autres joueurs du salon concerné, pour la durée de la partie
        et les besoins du vote. Ils ne sont pas publiés en dehors de ce cadre.
      </p>
    </LegalSection>

    <LegalSection heading="Offres de soutien">
      <p>
        Le jeu est gratuit et financé par la publicité. Deux offres permettent de
        la retirer : l'abonnement « Sans pub » à{' '}
        {PRICE_AD_FREE_MONTHLY_LABEL} par mois, résiliable à tout moment, et
        l'achat unique « Supporter à vie » à {PRICE_SUPPORTER_LIFETIME_LABEL},
        sans renouvellement.
      </p>
      <p>
        Les paiements sont traités par Paddle, qui agit comme vendeur officiel et
        émet la facture. En cas de résiliation de l'abonnement, l'accès sans
        publicité reste actif jusqu'à la fin de la période déjà payée. En cas de
        remboursement ou de contestation bancaire acceptée, l'avantage est révoqué.
      </p>
      <p>
        Les demandes de remboursement et la gestion de l'abonnement passent par le
        portail client Paddle, accessible depuis le jeu.
      </p>
    </LegalSection>

    <LegalSection heading="Disponibilité">
      <p>
        Le service est fourni en l'état, sans garantie de disponibilité continue.
        Des interruptions peuvent survenir pour maintenance, mise à jour ou du
        fait d'un prestataire tiers. Les modes de jeu peuvent évoluer, être
        ajoutés ou retirés.
      </p>
    </LegalSection>

    <LegalSection heading="Responsabilité">
      <p>
        {PUBLISHER_NAME} ne saurait être tenu responsable des contenus envoyés par
        les joueurs, ni des dommages indirects liés à l'utilisation du jeu. Rien
        dans ces conditions ne limite les droits que la loi t'accorde en tant que
        consommateur.
      </p>
    </LegalSection>

    <LegalSection heading="Résiliation">
      <p>
        Tu peux cesser d'utiliser le jeu à tout moment et demander la suppression
        de ton compte en écrivant à{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalSection>

    <LegalSection heading="Évolution des conditions">
      <p>
        Ces conditions peuvent être modifiées. La date de dernière mise à jour
        figure en bas de cette page.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Conditions;
