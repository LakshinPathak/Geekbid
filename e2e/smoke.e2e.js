/* global device, element, by, expect */

describe('GeekBid smoke flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, newInstance: true });
  });

  it('can enter freelancer flow and open main feed', async () => {
    await expect(element(by.id('auth-freelancer-btn'))).toBeVisible();
    await element(by.id('auth-freelancer-btn')).tap();
    await expect(element(by.id('feed-search-input'))).toBeVisible();
  });

  it('can switch role from profile', async () => {
    await element(by.text('Profile')).tap();
    await expect(element(by.id('profile-switch-role-btn'))).toBeVisible();
    await element(by.id('profile-switch-role-btn')).tap();
  });

  it('can open post job and submit from client mode', async () => {
    await element(by.id('profile-switch-role-btn')).tap();
    await element(by.text('Post Job')).tap();
    await element(by.id('postjob-title-input')).replaceText('E2E Job Post');
    await element(by.id('postjob-description-input')).replaceText(
      'End-to-end submission test for job posting with reverse bidding constraints and expected app behavior.'
    );
    await element(by.id('postjob-submit-btn')).tap();
  });
});
