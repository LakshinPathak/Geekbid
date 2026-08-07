import StaticContentPage from "@/components/StaticContentPage";

export default function TermsPage() {
  return (
    <StaticContentPage title="Terms of Service">
      <p>Last updated 2026.</p>
      <p>
        By creating a GeekBid account you agree to use the platform in good faith: post real
        jobs, submit real bids, and honor the price a job decays to or the bid you accept.
        Posting jobs is free; freelancers pay a success fee only when they win a job, at the
        rate listed for their plan.
      </p>
      <p>
        Funds for an accepted bid are held in escrow and released to the freelancer once the
        client approves delivered work, or through dispute resolution if the two sides can&apos;t
        agree. GeekBid does not guarantee the quality of work exchanged between clients and
        freelancers, but does guarantee that escrowed funds are only released per this process.
      </p>
      <p>
        Accounts found bidding, posting, or reviewing in bad faith — including fake jobs, bid
        manipulation, or circumventing the platform fee — may be suspended.
      </p>
      <p>
        This is a summary for product purposes; a full legal terms document would replace this
        page before GeekBid processes real payments.
      </p>
    </StaticContentPage>
  );
}
