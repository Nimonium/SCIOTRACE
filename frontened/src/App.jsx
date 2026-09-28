import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import SocialRadar from './screens/SocialRadar';
import NarrativeExplorer from './screens/NarrativeExplorer';
import TrendForecast from './screens/TrendForecast';
import NetworkView from './screens/NetworkView';
import AskAI from './screens/AskAI';
import NarrativesList from './screens/NarrativesList';
import AlertsList from './screens/AlertsList';
import CommunitiesView from './screens/CommunitiesView';
import DemographicsView from './screens/DemographicsView';
import IngestionView from './screens/IngestionView';
import SettingsView from './screens/SettingsView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SocialRadar />} />
          <Route path="narratives" element={<NarrativesList />} />
          <Route path="narratives/:id" element={<NarrativeExplorer />} />
          <Route path="trends" element={<TrendForecast />} />
          <Route path="alerts" element={<AlertsList />} />
          <Route path="communities" element={<CommunitiesView />} />
          <Route path="network" element={<Navigate to="/network/default" replace />} />
          <Route path="network/:id" element={<NetworkView />} />
          <Route path="demographics" element={<DemographicsView />} />
          <Route path="ask" element={<AskAI />} />
          <Route path="ingestion" element={<IngestionView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
