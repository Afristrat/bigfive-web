import { title } from '@/components/primitives';
import { supportEmail } from '@/config/site';

export default function PrivacyPage() {
  return (
    <>
      <div className='text-center'>
        <h1 className={title()}>Privacy</h1>
        <h5 className='text-default-500 text-lg'>Our privacy policy</h5>
      </div>
      <div className='mt-10'>
        This privacy policy will explain how we use the personal data we collect
        from you when you use our website.
        <h2>What data do we collect?</h2>
        When you submit the test we collect the following data
        <br />
        <br />
        <ul>
          <li>Choosen test language</li>
          <li>Test answers</li>
          <li>Time spent on the test</li>
          <li>Datetime of submitted test</li>
        </ul>
        <br />
        If you use the feedback form or the translation forms, we also store the
        name, e-mail address and message you enter. If you ask us to e-mail you
        the link to a result, the address you enter is only used to send that
        message through our e-mail provider, Resend, and is not stored in our
        database.
        <br />
        <br />
        We do not use analytics services, advertising or tracking cookies. The
        site keeps a count of views per article, without any personal data.
        <h2>How do we collect your data?</h2>
        Your web browser automatically sends information to our server when you
        load a page. This can i.e. be information about which browser and
        version you are using and your Internet address (IP-address). Your
        IP-address is kept temporarily in the memory of the server to limit the
        number of submissions, and is not stored in our database.
        <br />
        <br />
        When you submit the test the information you provide (described above)
        is stored in our database.
        <h2>How will we use your data?</h2>
        We will create statistical, aggregated data from the test results for
        analytical purposes.
        <h2>How to contact us?</h2>
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
      </div>
    </>
  );
}
