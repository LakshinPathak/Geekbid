import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AppProvider } from '../src/context/AppContext';
import { ChatRoomScreen } from '../src/screens/ChatRoomScreen';
import { FeedScreen } from '../src/screens/FeedScreen';
import { PaymentsScreen } from '../src/screens/PaymentsScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('module UI screens', () => {
  it('renders feed inside navigation context', () => {
    const { getByText } = render(
      <AppProvider>
        <NavigationContainer>
          <FeedScreen />
        </NavigationContainer>
      </AppProvider>
    );

    expect(getByText('Live Feed')).toBeTruthy();
  });

  it('cycles roles from profile switch action', () => {
    const { getByText } = render(
      <AppProvider>
        <ProfileScreen />
      </AppProvider>
    );

    expect(getByText('FREELANCER')).toBeTruthy();
    fireEvent.press(getByText('Switch to Admin'));
    expect(getByText('ADMIN')).toBeTruthy();
    fireEvent.press(getByText('Switch to Client'));
    expect(getByText('CLIENT')).toBeTruthy();
  });

  it('releases held escrow from payments screen', () => {
    const { getAllByText } = render(
      <AppProvider>
        <PaymentsScreen />
      </AppProvider>
    );

    const beforeReleased = getAllByText('Status: RELEASED').length;
    fireEvent.press(getAllByText('Release')[1]);
    const afterReleased = getAllByText('Status: RELEASED').length;

    expect(afterReleased).toBeGreaterThan(beforeReleased);
  });

  it('sends a message in chat room', () => {
    const route = { key: 'ChatRoom', name: 'ChatRoom', params: { roomId: 'room-1', title: 'Room' } };

    const { getByPlaceholderText, getByText } = render(
      <AppProvider>
        <ChatRoomScreen route={route as never} navigation={{} as never} />
      </AppProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Type a message'), 'UI message test');
    fireEvent.press(getByText('Send'));

    expect(getByText('UI message test')).toBeTruthy();
  });
});
