import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

type JobStatus = 'In progress' | 'Waiting parts' | 'Ready' | 'Diagnosing';

const stats = [
  { label: 'Open jobs', value: '12', change: '+3 today', tone: 'text-violet-500' },
  { label: 'Vehicles in shop', value: '8', change: '2 waiting on parts', tone: 'text-sky-500' },
  { label: 'Customers', value: '146', change: '4 new this week', tone: 'text-green-500' },
  { label: 'Completed', value: '5', change: 'Finished today', tone: 'text-yellow-500' },
] as const;

const jobs: Array<{ id: string; customer: string; vehicle: string; status: JobStatus }> = [
  { id: 'RO-1042', customer: 'Maya Chen', vehicle: '2018 Honda Civic', status: 'In progress' },
  { id: 'RO-1041', customer: 'Luis Ortega', vehicle: '2021 Toyota RAV4', status: 'Waiting parts' },
  { id: 'RO-1038', customer: 'Ava Brooks', vehicle: '2016 Ford F-150', status: 'Ready' },
  { id: 'RO-1035', customer: 'Noah Patel', vehicle: '2020 Subaru Outback', status: 'Diagnosing' },
];

const statusClass: Record<JobStatus, string> = {
  'In progress': 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  'Waiting parts': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  Ready: 'bg-green-500/20 text-green-700 dark:text-green-400',
  Diagnosing: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="col-span-full sm:col-span-6 xl:col-span-3 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
            <div className="px-5 py-4">
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{stat.label}</div>
              <div className={`text-3xl font-bold ${stat.tone}`}>{stat.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.change}</div>
            </div>
          </div>
        ))}

        <div className="col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Recent repair orders</h2>
          </header>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-left">Order</div></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-left">Customer</div></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-left">Vehicle</div></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-left">Status</div></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="p-2 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{job.id}</div>
                      </td>
                      <td className="p-2 whitespace-nowrap">{job.customer}</td>
                      <td className="p-2 whitespace-nowrap">{job.vehicle}</td>
                      <td className="p-2 whitespace-nowrap">
                        <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${statusClass[job.status]}`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
