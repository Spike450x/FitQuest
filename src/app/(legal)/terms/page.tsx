import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — FitQuest',
};

export default function TermsPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Terms of Use</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Last updated: 30 May 2026 &nbsp;·&nbsp; Effective: 30 May 2026
      </p>

      <p>
        Welcome to FitQuest. These Terms of Use (&quot;Terms&quot;) govern your access to and use of
        FitQuest (the &quot;Service&quot;), operated by Josh Wood (&quot;we&quot;, &quot;our&quot;,
        or &quot;us&quot;). By creating an account or using FitQuest, you agree to these Terms. If
        you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        FitQuest is a free, web-based fitness RPG that turns real-world physical activity into
        in-game progression. You log workouts, earn XP, level up a character, and complete quests.
        The Service is provided for personal, non-commercial use only.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use FitQuest. By using the Service, you represent that
        you meet this requirement. If you are under 18, you should review these Terms with a parent
        or guardian.
      </p>

      <h2>3. Your Account</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for
        all activity that occurs under your account. Notify us immediately at{' '}
        <a href="mailto:joshwood0505@gmail.com">joshwood0505@gmail.com</a> if you suspect
        unauthorised access. We reserve the right to terminate accounts that violate these Terms.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Submit false or fabricated activity data to gain in-game rewards</li>
        <li>Attempt to reverse-engineer, hack, or otherwise tamper with the Service</li>
        <li>Use the Service in any way that violates applicable laws or regulations</li>
        <li>
          Attempt to access another user&apos;s account or data without their explicit permission
        </li>
        <li>
          Use automated scripts or bots to interact with the Service without prior written consent
        </li>
      </ul>

      <h2>5. Fitness Disclaimer</h2>
      <p>
        FitQuest is a game, not a medical or fitness-coaching service.{' '}
        <strong>Nothing in FitQuest constitutes medical advice, diagnosis, or treatment.</strong>{' '}
        Always consult a qualified healthcare professional before beginning any exercise programme,
        especially if you have a pre-existing health condition. We are not liable for any injury,
        illness, or other harm arising from physical activity you undertake in connection with your
        use of FitQuest.
      </p>

      <h2>6. Connected Third-Party Apps</h2>
      <p>
        FitQuest allows you to connect third-party apps (such as Strava) to automatically import
        activity data. By connecting a third-party app, you authorise FitQuest to receive data from
        that provider on your behalf. You remain subject to that provider&apos;s own terms of
        service and privacy policy. We are not responsible for the practices or content of any
        third-party service.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        All content, design, code, graphics, and game systems in FitQuest are owned by Josh Wood and
        protected by copyright and other intellectual property laws.
      </p>
      <p>© {new Date().getFullYear()} Josh Wood. All rights reserved.</p>
      <p>
        You may not reproduce, distribute, modify, or create derivative works from any part of
        FitQuest without prior written permission.
      </p>

      <h2>8. Availability and Changes</h2>
      <p>
        We may modify, suspend, or discontinue the Service at any time without notice. We may also
        update game mechanics, XP formulas, rewards, or content — changes to game balance are
        inherent to operating a game and do not constitute a breach of these Terms.
      </p>

      <h2>9. Disclaimer of Warranties</h2>
      <p>
        FitQuest is provided &quot;as is&quot; and &quot;as available&quot; without any warranty of
        any kind, express or implied, including but not limited to warranties of merchantability,
        fitness for a particular purpose, or non-infringement. We do not warrant that the Service
        will be uninterrupted, error-free, or free of harmful components.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by applicable law, Josh Wood shall not be liable for any
        indirect, incidental, special, consequential, or punitive damages arising out of or related
        to your use of FitQuest, even if advised of the possibility of such damages. Our total
        liability for any claim relating to the Service shall not exceed the amount you paid us in
        the twelve months preceding the claim (which, for a free service, is zero).
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the United States, without regard to conflict of law
        principles. Any disputes shall be resolved in the courts of competent jurisdiction in the
        United States.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will update the &quot;Last
        updated&quot; date above. Continued use of FitQuest after updated Terms are posted
        constitutes your acceptance of the changes.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:joshwood0505@gmail.com">joshwood0505@gmail.com</a>.
      </p>

      <hr />
      <p className="text-sm text-gray-500 dark:text-slate-400">
        © {new Date().getFullYear()} Josh Wood. All rights reserved.
      </p>
    </article>
  );
}
