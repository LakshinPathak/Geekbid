import StaticContentPage from "@/components/StaticContentPage";

export default function ContactPage() {
  return (
    <StaticContentPage title="Contact us">
      <p>
        General questions, partnership inquiries, or press —{" "}
        <a href="mailto:hello@geekbid.com" className="text-[#5b21b6] hover:underline">
          hello@geekbid.com
        </a>
        .
      </p>
      <p>
        Need help with an active job, bid, or payment?{" "}
        <a href="mailto:support@geekbid.com" className="text-[#5b21b6] hover:underline">
          support@geekbid.com
        </a>{" "}
        gets you to the right team faster.
      </p>
      <p>
        Found a security issue?{" "}
        <a href="mailto:security@geekbid.com" className="text-[#5b21b6] hover:underline">
          security@geekbid.com
        </a>
        .
      </p>
    </StaticContentPage>
  );
}
