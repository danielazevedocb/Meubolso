import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/PrimaryButton';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

describe('PrimaryButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Salvar alterações" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Entrar" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
