'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  FileText,
  DollarSign,
  Users,
  RefreshCw,
  UserPlus,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert UTC timestamp to Korean time (Asia/Seoul, UTC+9)
 * @param dateString - ISO 8601 date string from database
 * @param includeTime - Include time in output (default: true)
 * @returns Formatted date string in Korean timezone
 */
const toKoreanTime = (dateString: string, includeTime: boolean = true) => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };

  return new Date(dateString).toLocaleString('ko-KR', options);
};

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface Stats {
  totalSearches: number;
  aiSearches: number;
  totalUsers: number;
  newUsers: number;
  totalPayments: number;
  totalRevenue: number;
  avgPaymentAmount: number;
  totalApplications: number;
  successfulApplications: number;
  applicationSuccessRate: number;
}

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  total_charged: number;
  total_used: number;
  created_at: string;
}

interface SearchLog {
  id: number;
  query: string;
  user_id: number | null;
  user_email: string | null;
  result_count: number;
  is_ai_search: boolean;
  created_at: string;
}

interface Payment {
  id: number;
  user_id: number;
  user_email: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Application {
  id: number;
  user_id: number;
  user_email: string;
  announcement_id: string;
  announcement_title: string | null;
  status: string;
  cost: number;
  created_at: string;
}

interface CreditTransaction {
  id: number;
  user_id: number;
  user_email: string;
  type: 'charge' | 'usage';
  description: string;
  amount: number;
  created_at: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Overview stats
  const [stats, setStats] = useState<Stats>({
    totalSearches: 0,
    aiSearches: 0,
    totalUsers: 0,
    newUsers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    avgPaymentAmount: 0,
    totalApplications: 0,
    successfulApplications: 0,
    applicationSuccessRate: 0,
  });

  // Users tab
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersSortField, setUsersSortField] = useState<string>('created_at');
  const [usersSortOrder, setUsersSortOrder] = useState<'asc' | 'desc'>('desc');

  // Searches tab
  const [searches, setSearches] = useState<SearchLog[]>([]);
  const [searchesPage, setSearchesPage] = useState(1);
  const [searchesTotal, setSearchesTotal] = useState(0);
  const [searchesSearch, setSearchesSearch] = useState('');

  // Payments tab
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsSearch, setPaymentsSearch] = useState('');

  // Applications tab
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [applicationsSearch, setApplicationsSearch] = useState('');

  // Credits tab
  const [credits, setCredits] = useState<CreditTransaction[]>([]);
  const [creditsPage, setCreditsPage] = useState(1);
  const [creditsTotal, setCreditsTotal] = useState(0);
  const [creditsTimeRange, setCreditsTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const [loading, setLoading] = useState(true);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'searches') {
      fetchSearches();
    } else if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'credits') {
      fetchCredits();
    }
  }, [activeTab, timeRange]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [usersPage, usersSearch, usersSortField, usersSortOrder]);

  useEffect(() => {
    if (activeTab === 'searches') {
      fetchSearches();
    }
  }, [searchesPage, searchesSearch]);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [paymentsPage, paymentsSearch]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [applicationsPage, applicationsSearch]);

  useEffect(() => {
    if (activeTab === 'credits') {
      fetchCredits();
    }
  }, [creditsPage, creditsTimeRange]);

  // ============================================================================
  // Fetch Functions
  // ============================================================================

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stats?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '50',
        search: usersSearch,
        sortField: usersSortField,
        sortOrder: usersSortOrder,
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setUsersTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSearches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: searchesPage.toString(),
        limit: '50',
        search: searchesSearch,
      });
      const response = await fetch(`/api/admin/all-searches?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSearches(data.searches || []);
        setSearchesTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch searches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paymentsPage.toString(),
        limit: '50',
        search: paymentsSearch,
      });
      const response = await fetch(`/api/admin/all-payments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setPaymentsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: applicationsPage.toString(),
        limit: '50',
        search: applicationsSearch,
      });
      const response = await fetch(`/api/admin/all-applications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
        setApplicationsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch applications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: creditsPage.toString(),
        limit: '50',
        timeRange: creditsTimeRange,
      });
      const response = await fetch(`/api/admin/credit-transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCredits(data.transactions || []);
        setCreditsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('[Admin] Failed to fetch credit transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'overview') await fetchStats();
    else if (activeTab === 'users') await fetchUsers();
    else if (activeTab === 'searches') await fetchSearches();
    else if (activeTab === 'payments') await fetchPayments();
    else if (activeTab === 'applications') await fetchApplications();
    else if (activeTab === 'credits') await fetchCredits();
  };

  const handleUsersSort = (field: string) => {
    if (usersSortField === field) {
      setUsersSortOrder(usersSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setUsersSortField(field);
      setUsersSortOrder('desc');
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderPagination = (page: number, total: number, setPage: (page: number) => void) => {
    const totalPages = Math.ceil(total / 50);
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Total: {total.toLocaleString()} items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="searches">Searches</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ====================================================================== */}
        {/* OVERVIEW TAB */}
        {/* ====================================================================== */}
        <TabsContent value="overview">
          {/* Time Range Filter */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant={timeRange === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('today')}
            >
              Today
            </Button>
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All Time
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                <Search className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSearches.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">
                  AI: {stats.aiSearches.toLocaleString()} ({stats.totalSearches > 0 ? ((stats.aiSearches / stats.totalSearches) * 100).toFixed(1) : 0}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  +{stats.newUsers.toLocaleString()} new
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}원</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalPayments.toLocaleString()} payments (avg: {Math.round(stats.avgPaymentAmount).toLocaleString()}원)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalApplications.toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.successfulApplications.toLocaleString()} completed ({stats.applicationSuccessRate.toFixed(1)}%)
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* USERS TAB */}
        {/* ====================================================================== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>All registered users and their credit balances</CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search by email or name..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th
                            className="text-left py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('email')}
                          >
                            Email {usersSortField === 'email' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th
                            className="text-left py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('name')}
                          >
                            Name {usersSortField === 'name' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Role</th>
                          <th
                            className="text-right py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('balance')}
                          >
                            Balance {usersSortField === 'balance' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th
                            className="text-right py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('total_charged')}
                          >
                            Total Charged {usersSortField === 'total_charged' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th
                            className="text-right py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('total_used')}
                          >
                            Total Used {usersSortField === 'total_used' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th
                            className="text-left py-3 px-4 font-medium text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUsersSort('created_at')}
                          >
                            Joined {usersSortField === 'created_at' && (usersSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-sm">{user.email}</td>
                            <td className="py-3 px-4 text-sm">{user.name || '-'}</td>
                            <td className="py-3 px-4 text-sm">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium">
                              {user.balance.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-green-600">
                              +{user.total_charged.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-red-600">
                              -{user.total_used.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {toKoreanTime(user.created_at, false)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(usersPage, usersTotal, setUsersPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* SEARCHES TAB */}
        {/* ====================================================================== */}
        <TabsContent value="searches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Search Logs</CardTitle>
                  <CardDescription>All user search queries</CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search by query..."
                    value={searchesSearch}
                    onChange={(e) => {
                      setSearchesSearch(e.target.value);
                      setSearchesPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : searches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No searches found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-sm">Query</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                          <th className="text-center py-3 px-4 font-medium text-sm">Results</th>
                          <th className="text-center py-3 px-4 font-medium text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searches.map((search) => (
                          <tr key={search.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-sm font-medium">{search.query}</td>
                            <td className="py-3 px-4 text-sm">{search.user_email || 'Guest'}</td>
                            <td className="py-3 px-4 text-sm text-center">{search.result_count}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={search.is_ai_search ? 'default' : 'secondary'}>
                                {search.is_ai_search ? 'AI' : 'Keyword'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {toKoreanTime(search.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(searchesPage, searchesTotal, setSearchesPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* PAYMENTS TAB */}
        {/* ====================================================================== */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>All credit charge transactions</CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search by user email..."
                    value={paymentsSearch}
                    onChange={(e) => {
                      setPaymentsSearch(e.target.value);
                      setPaymentsPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No payments found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-sm">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                          <th className="text-right py-3 px-4 font-medium text-sm">Amount</th>
                          <th className="text-center py-3 px-4 font-medium text-sm">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-sm font-mono text-xs">#{payment.id}</td>
                            <td className="py-3 px-4 text-sm">{payment.user_email}</td>
                            <td className="py-3 px-4 text-sm text-right font-bold text-green-600">
                              +{payment.amount.toLocaleString()}원
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {toKoreanTime(payment.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(paymentsPage, paymentsTotal, setPaymentsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* APPLICATIONS TAB */}
        {/* ====================================================================== */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Applications</CardTitle>
                  <CardDescription>All user-generated applications</CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search by user email..."
                    value={applicationsSearch}
                    onChange={(e) => {
                      setApplicationsSearch(e.target.value);
                      setApplicationsPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No applications found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-sm">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Announcement</th>
                          <th className="text-center py-3 px-4 font-medium text-sm">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-sm">Cost</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-sm font-mono">{app.id}</td>
                            <td className="py-3 px-4 text-sm">{app.user_email}</td>
                            <td className="py-3 px-4 text-sm max-w-xs truncate">
                              {app.announcement_title || app.announcement_id}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={app.status === 'completed' ? 'default' : 'secondary'}>
                                {app.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-red-600">
                              -{app.cost.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {toKoreanTime(app.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(applicationsPage, applicationsTotal, setApplicationsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================================================================== */}
        {/* CREDITS TAB */}
        {/* ====================================================================== */}
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Credit Transactions</CardTitle>
                  <CardDescription>All charges and usage</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={creditsTimeRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreditsTimeRange('today');
                      setCreditsPage(1);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={creditsTimeRange === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreditsTimeRange('week');
                      setCreditsPage(1);
                    }}
                  >
                    Week
                  </Button>
                  <Button
                    variant={creditsTimeRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreditsTimeRange('month');
                      setCreditsPage(1);
                    }}
                  >
                    Month
                  </Button>
                  <Button
                    variant={creditsTimeRange === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreditsTimeRange('all');
                      setCreditsPage(1);
                    }}
                  >
                    All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : credits.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No transactions found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center py-3 px-4 font-medium text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Description</th>
                          <th className="text-right py-3 px-4 font-medium text-sm">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credits.map((credit) => (
                          <tr key={credit.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-center">
                              {credit.type === 'charge' ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-600 mx-auto" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-600 mx-auto" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm">{credit.user_email}</td>
                            <td className="py-3 px-4 text-sm">{credit.description}</td>
                            <td className={`py-3 px-4 text-sm text-right font-bold ${
                              credit.type === 'charge' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {credit.type === 'charge' ? '+' : '-'}{credit.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {toKoreanTime(credit.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(creditsPage, creditsTotal, setCreditsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
