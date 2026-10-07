// import { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { getEmployee, getMyProfile } from '../../api/employees';
// import './Employees.css';

// // Use at /employees/:id (HR/manager) and /profile (any employee, shows own profile with mine={true})
// export default function EmployeeDetails({ mine = false }) {
//   const { id } = useParams();
//   const [emp, setEmp] = useState(null);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     (mine ? getMyProfile() : getEmployee(id)).then(setEmp)
//       .catch((e) => setError(e.response?.data?.message || 'Could not load employee'));
//   }, [id, mine]);

//   if (error) return <div className="emp-page"><div className="alert alert-error">{error}</div></div>;
//   if (!emp) return <div className="emp-page">Loading...</div>;

//   const rows = [
//     ['Employee code', emp.employee_code], ['Email', emp.email], ['Phone', emp.phone],
//     ['National ID', emp.national_id], ['Gender', emp.gender], ['Date of birth', emp.date_of_birth],
//     ['Hire date', emp.hire_date], ['Department', emp.department_name], ['Position', emp.position_title],
//     ['Manager', emp.manager_name], ['Address', emp.address],
//   ];

//   return (
//     <div className="emp-page">
//       <div className="emp-header">
//         <h2>{emp.first_name} {emp.last_name} <span className={`badge badge-${emp.status}`}>{emp.status}</span></h2>
//         {!mine && <Link className="btn" to="/employees">Back</Link>}
//       </div>
//       {emp.status_reason && emp.status !== 'active' && <div className="alert">Reason: {emp.status_reason}</div>}
//       <dl className="details">
//         {rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v || '-'}</dd></div>))}
//       </dl>
//     </div>
//   );
// }
