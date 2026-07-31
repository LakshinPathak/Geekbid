import StaticContentPage from "@/components/StaticContentPage";

export default function PrivacyPage() {
  return (
    <StaticContentPage title="Privacy Policy">
      <p>Last updated 2026.</p>
      <p>
        We collect the information needed to run the marketplace: your account details, job
        posts and bids, messages between clients and freelancers, and payment/escrow records.
        We use this data to match jobs to freelancers, process payments, calculate GeekScore
        reputations, and keep the platform secure.
      </p>
      <p>
        We don&apos;t sell your personal data. We share it only with the service providers that
        power the platform (payments, hosting, email) and only as needed to provide the
        service, or when required by law.
      </p>
      <p>
        You can request an export or deletion of your account data at any time from account
        settings, or by emailing{" "}
        <a href="mailto:privacy@geekbid.com" className="text-[#5b21b6] hover:underline">
          privacy@geekbid.com
        </a>
        .
      </p>
    </StaticContentPage>
  );
}
