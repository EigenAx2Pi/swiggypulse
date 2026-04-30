import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MenuPerformance } from './components/MenuPerformance';
import { CouponAnalysis } from './components/CouponAnalysis';
import { WeatherImpact } from './components/WeatherImpact';
import { Recommendations } from './components/Recommendations';
import { DineoutInsights } from './components/DineoutInsights';
import { ChatInterface } from './components/ChatInterface';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menu" element={<MenuPerformance />} />
          <Route path="/coupons" element={<CouponAnalysis />} />
          <Route path="/weather" element={<WeatherImpact />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/dineout" element={<DineoutInsights />} />
          <Route path="/chat" element={<ChatInterface />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
