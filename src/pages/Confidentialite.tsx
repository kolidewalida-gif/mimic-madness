import { LegalLayout, LegalSection } from '@/components/LegalLayout';
import { CONTACT_EMAIL, PUBLISHER_NAME } from '@/lib/legal';

const Confidentialite = () => (
  <LegalLayout
    title="Politique de confidentialité"
    description="Quelles données Mimic Master collecte, pourquoi, combien de temps, et comment exercer tes droits."
  >
    <LegalSection heading="Qui traite tes données">
      <p>
        {PUBLISHER_NAME} édite et exploite ce jeu de soirée multijoueur accessible
        en ligne. Pour toute question relative à tes données, écris à{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalSection>

    <LegalSection heading="Données collectées">
      <p>La collecte est limitée à ce que le jeu exige pour fonctionner :</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Compte</strong> : lors de la connexion avec Google, nous
          recevons ton identifiant, ton adresse e-mail, ton nom affiché et ton
          image de profil. Nous ne recevons jamais ton mot de passe Google.
        </li>
        <li>
          <strong>Profil de jeu</strong> : pseudo, avatar choisi, titres, niveau,
          expérience, série de connexions et statistiques de parties.
        </li>
        <li>
          <strong>Parties</strong> : salons rejoints, votes, scores et messages
          envoyés dans le chat du salon.
        </li>
        <li>
          <strong>Enregistrements</strong> : dans les modes qui reposent sur
          l'imitation, les extraits audio ou vidéo que tu envoies volontairement,
          afin que les autres joueurs du salon puissent les écouter et voter.
        </li>
        <li>
          <strong>Soutien</strong> : si tu souscris une offre, nous conservons
          l'identifiant de transaction, l'offre choisie et son statut.
        </li>
      </ul>
      <p>
        Nous ne recevons ni ne stockons aucune donnée bancaire : aucun numéro de
        carte ne transite par nos serveurs.
      </p>
    </LegalSection>

    <LegalSection heading="Finalités">
      <p>
        Ces données servent à créer ton compte, faire fonctionner les parties en
        temps réel, tenir les classements et la progression, appliquer le droit
        « sans publicité » aux personnes qui soutiennent le jeu, et prévenir les
        abus.
      </p>
    </LegalSection>

    <LegalSection heading="Publicité et cookies">
      <p>
        Le jeu est financé par la publicité. Nous utilisons Google AdSense, qui
        peut déposer des cookies ou lire des identifiants publicitaires afin de
        diffuser et mesurer des annonces, y compris des annonces personnalisées
        selon tes visites précédentes sur ce site et sur d'autres sites.
      </p>
      <p>
        Tu peux désactiver la personnalisation des annonces dans les{' '}
        <a
          className="underline"
          href="https://myadcenter.google.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          paramètres publicitaires de Google
        </a>
        , et gérer les cookies déposés par les fournisseurs tiers depuis{' '}
        <a
          className="underline"
          href="https://www.aboutads.info/choices/"
          target="_blank"
          rel="noopener noreferrer"
        >
          aboutads.info
        </a>
        . Les personnes ayant souscrit une offre de soutien ne voient aucune
        publicité et ne déclenchent donc pas le chargement de ces scripts.
      </p>
      <p>
        Les cookies et stockages strictement nécessaires (session de connexion,
        thème choisi, réglages audio) restent indispensables au fonctionnement du
        site.
      </p>
    </LegalSection>

    <LegalSection heading="Sous-traitants">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Google</strong> : authentification du compte et diffusion des
          annonces.
        </li>
        <li>
          <strong>Supabase</strong> : base de données, authentification et
          stockage des fichiers, hébergés dans l'Union européenne.
        </li>
        <li>
          <strong>Paddle</strong> : encaissement des offres de soutien, en qualité
          de vendeur officiel.
        </li>
        <li>
          <strong>Lovable et Cloudflare</strong> : hébergement et diffusion du
          site.
        </li>
      </ul>
    </LegalSection>

    <LegalSection heading="Durée de conservation">
      <p>
        Le profil et la progression sont conservés tant que ton compte existe. Les
        enregistrements audio et vidéo liés à une partie sont destinés au seul
        déroulement de cette partie et sont supprimés lorsqu'ils ne sont plus
        nécessaires. Les preuves de paiement sont conservées le temps imposé par
        les obligations comptables.
      </p>
    </LegalSection>

    <LegalSection heading="Tes droits">
      <p>
        Conformément au RGPD, tu disposes d'un droit d'accès, de rectification,
        d'effacement, de limitation, d'opposition et de portabilité. Pour les
        exercer, écris à{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
        depuis l'adresse associée à ton compte. La suppression du compte entraîne
        celle du profil et de la progression associée.
      </p>
    </LegalSection>

    <LegalSection heading="Âge minimum">
      <p>
        Le jeu n'est pas destiné aux enfants de moins de 13 ans. Si tu es mineur,
        demande l'accord de ton représentant légal avant de créer un compte et
        avant d'envoyer un enregistrement audio ou vidéo.
      </p>
    </LegalSection>

    <LegalSection heading="Sécurité">
      <p>
        Les accès à la base de données sont restreints par des règles de sécurité
        au niveau des lignes, de sorte qu'un joueur ne peut lire que ses propres
        données de compte et de paiement. Les clés de paiement et les secrets
        serveur ne sont jamais exposés au navigateur.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Confidentialite;
