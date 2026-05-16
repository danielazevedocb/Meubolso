import { StyleSheet, Text, View } from 'react-native';

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.caption}>Placeholder — fluxo de auth virá nas próximas tarefas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.75,
  },
});
