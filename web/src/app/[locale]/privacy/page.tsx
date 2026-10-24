import { subtitle, title } from '@/components/primitives';
import { supportEmail } from '@/config/site';

// Texte inchangé : il relève d'Amine et d'une relecture juridique, et sera
// réécrit avec la notice d'information des lots 1 et 2 (textes.md § 9).
export default function PrivacyPage() {
  return (
    <article className='colonne-lecture'>
      <h1 className={title()}>Privacy</h1>
      <p className={subtitle()}>Our privacy policy</p>
      <div className='texte-riche mt-8'>
        <p>
          This privacy policy will explain how we use the personal data we
          collect from you when you use our website.
        </p>
        <h2>What data do we collect?</h2>
        <p>When you submit the test we collect the following data</p>
        <ul>
          <li>Choosen test language</li>
          <li>Test answers</li>
          <li>Time spent on the test</li>
          <li>Datetime of submitted test</li>
        </ul>
        <p>
          We do not use analytics services, advertising or tracking cookies.
        </p>
        <h2>How do we collect your data?</h2>
        <p>
          Your web browser automatically sends information to our server when
          you load a page. This can i.e. be information about which browser and
          version you are using and your Internet address (IP-address). Your
          IP-address is kept temporarily in the memory of the server to limit
          the number of submissions, and is not stored in our database.
        </p>
        <p>
          When you submit the test the information you provide (described above)
          is stored in our database.
        </p>
        <h2>How will we use your data?</h2>
        <p>
          We will create statistical, aggregated data from the test results for
          analytical purposes.
        </p>
        <h2>Network survey: objections</h2>
        <p>
          When a person objects to being named in a team network survey, their
          name is kept for that sole purpose: to prove that the objection is
          respected. The named report delivered to Tenga Conseil includes only
          the answers of people who gave a separate consent.
        </p>
        <h2>How to contact us?</h2>
        <p>
          {supportEmail ? (
            <>
              If you have any questions about this privacy policy, please{' '}
              <a
                href={`mailto:${supportEmail}`}
                rel='noopener noreferrer'
                target='_blank'
              >
                contact
              </a>{' '}
              us.
            </>
          ) : (
            'If you have any questions about this privacy policy, please contact the operator of this website.'
          )}
        </p>
      </div>
    </article>
  );
}
