import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — FitQuest',
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Last updated: 30 May 2026 &nbsp;·&nbsp; Effective: 30 May 2026
      </p>

      <p>
        FitQuest (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is operated by Josh Wood as a
        personal project. This Privacy Policy explains what information we collect when you use
        FitQuest, how we use it, and the choices you have.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Account Information</h3>
      <p>
        When you register, we collect your email address and, optionally, a display name. This
        information is used solely to create and authenticate your account.
      </p>

      <h3>Fitness Activity Data</h3>
      <p>
        FitQuest is a fitness RPG. To power the game, we store the activities you log: exercise
        type, duration, distance, and the date and time of the activity. This data is used to
        calculate in-game rewards (XP, gold, level progression) and to display your personal history
        on the Statistics screen.
      </p>

      <h3>Game State Data</h3>
      <p>
        We store your character&apos;s level, stats, inventory, quest progress, achievement history,
        and other game state required to run FitQuest. This data lives entirely within your account
        and is never shared with other users without your consent.
      </p>

      <h3>Connected Device Data (Strava)</h3>
      <p>
        If you choose to connect a third-party app such as Strava, we receive activity data (workout
        type, distance, and duration) from that provider via a secure server-to-server connection.
        We store an OAuth access token and refresh token in a server-only Firestore collection (
        <code>healthTokens</code>) so activities can be imported automatically. We store only what
        is needed to log your activities in FitQuest — we do not store your Strava profile,
        followers, kudos, or any other Strava data. You can disconnect at any time by contacting us
        (see Section 8).
      </p>

      <h3>Usage and Technical Data</h3>
      <p>
        Firebase (our infrastructure provider) automatically collects basic technical information
        such as IP addresses and browser type for security and reliability purposes. We do not use
        third-party analytics or advertising trackers.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To operate and personalise your FitQuest game experience</li>
        <li>To calculate XP, rewards, and progression based on your real-world activities</li>
        <li>To authenticate you and keep your account secure</li>
        <li>To import activities from connected apps you have authorised</li>
        <li>To respond to support requests you send us</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your data. We do <strong>not</strong> use your fitness data
        for advertising. We do <strong>not</strong> share your personal information with any third
        party except as described below.
      </p>

      <h2>3. Third-Party Services</h2>

      <h3>Firebase / Google Cloud</h3>
      <p>
        FitQuest is built on Google Firebase (Authentication, Firestore, Cloud Functions, and
        Hosting). Your data is stored on Google&apos;s servers in accordance with the{' '}
        <a
          href="https://firebase.google.com/support/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Firebase Privacy Policy
        </a>
        .
      </p>

      <h3>Strava</h3>
      <p>
        If you connect your Strava account, your use of Strava is governed by the{' '}
        <a href="https://www.strava.com/legal/privacy" target="_blank" rel="noopener noreferrer">
          Strava Privacy Policy
        </a>
        . FitQuest only receives data that Strava explicitly authorises based on the scopes you
        approve during the OAuth flow (<code>activity:read</code>).
      </p>

      <h2>4. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. If you delete your account, we
        will delete your personal data and game state within 30 days, except where retention is
        required by applicable law.
      </p>

      <h2>5. Data Security</h2>
      <p>
        All data is transmitted over HTTPS. OAuth tokens for connected devices are stored in a
        server-only Firestore collection that is inaccessible to the client application and
        protected by Firebase Security Rules. While we take reasonable precautions, no internet
        transmission is 100% secure.
      </p>

      <h2>6. Children&apos;s Privacy</h2>
      <p>
        FitQuest is not directed at children under 13. We do not knowingly collect personal
        information from children under 13. If you believe a child has provided us with personal
        information, please contact us and we will delete it promptly.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and associated data</li>
        <li>Disconnect a third-party app integration at any time</li>
      </ul>
      <p>
        To exercise any of these rights, email us at{' '}
        <a href="mailto:joshwood0505@gmail.com">joshwood0505@gmail.com</a>.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about this policy? Email{' '}
        <a href="mailto:joshwood0505@gmail.com">joshwood0505@gmail.com</a>.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will update the
        &quot;Last updated&quot; date at the top of this page. Continued use of FitQuest after
        changes are posted constitutes acceptance of the updated policy.
      </p>

      <hr />
      <p className="text-sm text-gray-500 dark:text-slate-400">
        © {new Date().getFullYear()} Josh Wood. All rights reserved.
      </p>
    </article>
  );
}
