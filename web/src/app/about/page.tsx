import StaticContentPage from "@/components/StaticContentPage";

export default function AboutPage() {
  return (
    <StaticContentPage title="About GeekBid">
      <p>
        GeekBid is a reverse-auction marketplace for freelance talent. Instead of clients
        wading through dozens of manually-priced proposals, every job starts at a ceiling
        price and decays automatically over time until a freelancer accepts or the client
        awards the lowest bid — letting the market find the real number, live.
      </p>
      <p>
        We built GeekBid because hiring freelancers shouldn&apos;t mean weeks of back-and-forth
        emails and guesswork on price. Escrow-protected payments, transparent GeekScore
        reputations, and algorithmic pricing keep both sides honest and the process fast.
      </p>
      <p>
        We&apos;re a small, remote-first team focused on one problem: making freelance hiring
        as efficient as the freelancers who use it.
      </p>
    </StaticContentPage>
  );
}
