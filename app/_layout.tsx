import { Stack } from 'expo-router';

export default function RootLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="resultados" />
			<Stack.Screen name="ResultadosOficiais" />
			<Stack.Screen name="LoginScreen" />
		</Stack>
	);
}