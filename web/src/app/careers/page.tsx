import StaticContentPage from "@/components/StaticContentPage";

export default function CareersPage() {
  return (
    <StaticContentPage title="Careers">
      <p>
        We&apos;re not actively hiring right now, but we&apos;re always happy to hear from people
        who care about marketplaces, pricing mechanisms, or trust &amp; safety for freelance work.
      </p>
      <p>
        If that&apos;s you, reach out at{" "}
        <a href="mailto:careers@geekbid.com" className="text-[#5b21b6] hover:underline">
          careers@geekbid.com
        </a>{" "}
        and tell us what you&apos;d want to work on — we keep good conversations on file for
        when a role opens up.
      </p>
    </StaticContentPage>
  );
}
