import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PremiumSuccess() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  return <Redirect href={{ pathname: '/premium', params: { session_id } }} />;
}
