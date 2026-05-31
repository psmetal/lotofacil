import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ResultadosScreen from './screens/ResultadosScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Lotofácil' }} />
        <Stack.Screen name="Resultados" component={ResultadosScreen} options={{ title: 'Resultados' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
