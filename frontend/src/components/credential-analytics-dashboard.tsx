import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, Clock, Plus, Download, ShieldAlert, 
  CheckCircle2, XCircle, FileText, Share2, Server
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'verification' | 'share' | 'issue' | 'revoke';
  description: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

interface AnalyticsData {
  usage: {
    totalIdentities: number;
    activeIdentities: number;
    revokedIdentities: number;
  };
  verificationRates: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  sharingPatterns: {
    total: number;
    active: number;
    expired: number;
  };
  verificationTrend: {
    date: string;
    count: number;
  }[];
  recentActivity: ActivityItem[];
  systemStatus: {
    uptime: string;
    apiLatency: string;
    status: 'operational' | 'degraded' | 'down';
  };
}

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'];

const MOCK_DATA: AnalyticsData = {
  usage: { totalIdentities: 120, activeIdentities: 105, revokedIdentities: 15 },
  verificationRates: { total: 300, approved: 250, pending: 30, rejected: 20 },
  sharingPatterns: { total: 150, active: 80, expired: 70 },
  verificationTrend: [
    { date: '1/1', count: 12 },
    { date: '1/2', count: 19 },
    { date: '1/3', count: 15 },
    { date: '1/4', count: 22 },
    { date: '1/5', count: 30 },
    { date: '1/6', count: 25 },
    { date: '1/7', count: 35 }
  ],
  recentActivity: [
    { id: '1', type: 'verification', description: 'Vaccination verified by Clinic A', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: 'success' },
    { id: '2', type: 'share', description: 'Credential shared with Employer B', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: 'success' },
    { id: '3', type: 'revoke', description: 'Access revoked for Employer C', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), status: 'success' },
    { id: '4', type: 'verification', description: 'Verification failed for expired credential', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), status: 'failed' }
  ],
  systemStatus: {
    uptime: '99.99%',
    apiLatency: '45ms',
    status: 'operational'
  }
};

export function CredentialAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('http://localhost:3000/analytics/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData({ ...MOCK_DATA, ...json });
        } else {
          setData(MOCK_DATA);
        }
      } catch (e) {
        console.error("Failed to fetch analytics:", e);
        setData(MOCK_DATA);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-green-200">Loading analytics...</div>
      </div>
    );
  }

  const pieData = [
    { name: 'Approved', value: data.verificationRates.approved },
    { name: 'Pending', value: data.verificationRates.pending },
    { name: 'Rejected', value: data.verificationRates.rejected },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'verification': return <CheckCircle2 className="w-4 h-4" />;
      case 'share': return <Share2 className="w-4 h-4" />;
      case 'issue': return <FileText className="w-4 h-4" />;
      case 'revoke': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Credential Analytics Dashboard</h2>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" /> Issue New
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors border border-white/20">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Status & Performance Overview */}
      <div className="flex items-center gap-6 bg-white/5 rounded-lg p-3 border border-white/10 overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1 border-r border-white/10 shrink-0">
          <div className={`w-3 h-3 rounded-full ${data.systemStatus.status === 'operational' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-sm text-green-200">System: <span className="text-white capitalize">{data.systemStatus.status}</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border-r border-white/10 shrink-0">
          <Server className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-green-200">Uptime: <span className="text-white">{data.systemStatus.uptime}</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 shrink-0">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-green-200">API Latency: <span className="text-white">{data.systemStatus.apiLatency}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-green-200 text-sm font-medium">Total Credentials Issued</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.usage.totalIdentities}</p>
          <div className="mt-2 text-xs text-green-300">
            {data.usage.activeIdentities} active • {data.usage.revokedIdentities} revoked
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-blue-200 text-sm font-medium">Total Verifications</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.verificationRates.total}</p>
          <div className="mt-2 text-xs text-blue-300">
            {data.verificationRates.approved} approved • {data.verificationRates.rejected} rejected
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-purple-200 text-sm font-medium">Data Shares</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.sharingPatterns.total}</p>
          <div className="mt-2 text-xs text-purple-300">
            {data.sharingPatterns.active} active • {data.sharingPatterns.expired} expired
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10 lg:col-span-2">
          <h3 className="text-white text-lg font-medium mb-4">Verification Trend (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.verificationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#ffffff80" />
                <YAxis stroke="#ffffff80" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white text-lg font-medium mb-4">Verification Rates</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#ffffff80' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10 mt-6">
        <h3 className="text-white text-lg font-medium mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" /> Recent Activity
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {data.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
              <div className={`mt-1 p-2 rounded-full ${getStatusColor(activity.status)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{activity.description}</p>
                <p className="text-xs text-green-200 mt-1">
                  {new Date(activity.timestamp).toLocaleString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </p>
              </div>
              <div>
                <span className={`text-xs px-2 py-1 rounded-full border border-white/10 capitalize ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
          {data.recentActivity.length === 0 && (
            <p className="text-green-200 text-sm text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
