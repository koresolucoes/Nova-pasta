
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import type { StatCardData, AnalyticsDataPoint } from '../types';
import { CampaignIcon, ContactsIcon, ArrowUpIcon, TemplatesIcon, PaperAirplaneIcon } from '../components/icons';
import { getActiveConnection, getMessageTemplates, getAnalyticsData } from '../services/metaService';
import { getContacts } from '../services/contactService';

const StatCardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2 mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
);

export default function DashboardPage(): React.ReactNode {
  const [statsData, setStatsData] = useState<StatCardData[] | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatsData(null);
    setChartData([]);

    const connection = await getActiveConnection();
    if (!connection) {
      setError("Nenhuma conexão com a Meta está ativa. Por favor, vá para Configurações para adicionar ou ativar uma.");
      setIsLoading(false);
      return;
    }

    try {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);

        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(startDate.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);
        
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - 29);
        prevStartDate.setHours(0, 0, 0, 0);
        
        const [
            currentPeriodData,
            previousPeriodData,
            templates,
            localContacts
        ] = await Promise.all([
            getAnalyticsData(connection, startDate, endDate),
            getAnalyticsData(connection, prevStartDate, prevEndDate),
            getMessageTemplates(connection),
            getContacts()
        ]);

        const currentTotals = currentPeriodData.reduce((acc, dp) => ({
            sent: acc.sent + dp.sent_count,
            delivered: acc.delivered + dp.delivered_count,
            read: acc.read + dp.read_count,
        }), { sent: 0, delivered: 0, read: 0 });

        const currentReadRate = currentTotals.delivered > 0 ? (currentTotals.read / currentTotals.delivered) * 100 : 0;
        
        const previousTotals = previousPeriodData.reduce((acc, dp) => ({
            sent: acc.sent + dp.sent_count,
            delivered: acc.delivered + dp.delivered_count,
            read: acc.read + dp.read_count,
        }), { sent: 0, delivered: 0, read: 0 });
        
        const previousReadRate = previousTotals.delivered > 0 ? (previousTotals.read / previousTotals.delivered) * 100 : 0;
        
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const sentChangePercent = calculateChange(currentTotals.sent, previousTotals.sent);
        const readRateChangePoints = currentReadRate - previousReadRate;

        const newStatsData: StatCardData[] = [
            {
                title: 'Mensagens Enviadas (30d)',
                value: currentTotals.sent.toLocaleString('pt-BR'),
                change: `${Math.abs(sentChangePercent).toFixed(1)}%`,
                changeType: sentChangePercent >= 0 ? 'increase' : 'decrease',
                icon: <PaperAirplaneIcon />,
            },
            {
                title: 'Taxa de Leitura (30d)',
                value: `${currentReadRate.toFixed(1)}%`,
                change: `${Math.abs(readRateChangePoints).toFixed(1)} p.p.`,
                changeType: readRateChangePoints >= 0 ? 'increase' : 'decrease',
                icon: <ArrowUpIcon className="transform rotate-45" />,
            },
            {
                title: 'Total de Contatos',
                value: localContacts.length.toLocaleString('pt-BR'),
                change: '',
                changeType: 'increase',
                icon: <ContactsIcon />,
            },
            {
                title: 'Modelos Ativos (Meta)',
                value: templates.filter(t => t.status === 'APPROVED').length.toLocaleString('pt-BR'),
                change: '',
                changeType: 'increase',
                icon: <TemplatesIcon />,
            },
        ];
      
      setStatsData(newStatsData);
      
      const formattedChartData = currentPeriodData.map(dp => ({
            name: new Date(dp.start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            enviadas: dp.sent_count,
            lidas: dp.read_count,
      })).reverse();
      
      setChartData(formattedChartData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao buscar dados do dashboard.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const handleDataChange = () => fetchDashboardData();

    fetchDashboardData();
    window.addEventListener('metaConnectionChanged', handleDataChange);
    window.addEventListener('localDataChanged', handleDataChange);
    
    return () => {
        window.removeEventListener('metaConnectionChanged', handleDataChange);
        window.removeEventListener('localDataChanged', handleDataChange);
    };
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do desempenho das suas campanhas.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Erro</p>
            <p>{error} <Link to="/configuracoes" className="font-semibold underline hover:text-red-900">Ir para Configurações</Link>.</p>
        </div>
      ) : statsData && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statsData.map((stat) => (
                <StatCard key={stat.title} data={stat} />
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Desempenho de Mensagens (Últimos 30 dias)</h3>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#D1D5DB" />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#D1D5DB" />
                <Tooltip
                  cursor={{ fill: 'rgba(229, 231, 235, 0.5)' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}/>
                <Bar dataKey="enviadas" fill="#F59E0B" name="Enviadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lidas" fill="#FBBF24" name="Lidas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}