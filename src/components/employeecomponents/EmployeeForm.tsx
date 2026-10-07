// import { useEffect, useState } from 'react';
// import { useNavigate, useParams, Link } from 'react-router-dom';
// import { createEmployee, updateEmployee, getEmployee, getDepartments, getPositions, getEmployees } from '../../api/employees';
// import './Employees.css';

// const EMPTY = {
//   first_name: '', last_name: '', email: '', phone: '', national_id: '', gender: '',
//   date_of_birth: '', address: '', hire_date: '', department_id: '', position_id: '', manager_id: '',
// };

// // Defined outside the form component so inputs keep focus while typing
// function Field({ label, required, error, children }) {
//   return (
//     <label className="field">
//       <span>{label}{required && ' *'}</span>
//       {children}
//       {error && <small className="err">{error}</small>}
//     </label>
//   );
// }

// export default function EmployeeForm() {
//   const { id } = useParams();
//   const isEdit = Boolean(id);
//   const navigate = useNavigate();
//   const [form, setForm] = useState(EMPTY);
//   const [departments, setDepartments] = useState([]);
//   const [positions, setPositions] = useState([]);
//   const [managers, setManagers] = useState([]);
//   const [errors, setErrors] = useState({});
//   const [message, setMessage] = useState('');
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     getDepartments().then(setDepartments).catch(() => {});
//     getPositions().then(setPositions).catch(() => {});
//     getEmployees({ status: 'active', limit: 100 }).then((r) => setManagers(r.data)).catch(() => {});
//     if (isEdit) {
//       getEmployee(id).then((e) => setForm({
//         ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, e[k] ?? ''])),
//         date_of_birth: e.date_of_birth?.slice(0, 10) || '',
//         hire_date: e.hire_date?.slice(0, 10) || '',
//       })).catch(() => setMessage('Could not load employee'));
//     }
//   }, [id, isEdit]);

//   const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
//   const input = (k, type = 'text') => <input type={type} value={form[k]} onChange={set(k)} />;

//   // Positions are filtered by the selected department (positions with no department show for all)
//   const visiblePositions = positions.filter(
//     (p) => !form.department_id || !p.department_id || String(p.department_id) === String(form.department_id)
//   );

//   const validate = () => {
//     const er = {};
//     if (!form.first_name.trim()) er.first_name = 'First name is required';
//     if (!form.last_name.trim()) er.last_name = 'Last name is required';
//     if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Valid email is required';
//     if (!form.hire_date) er.hire_date = 'Hire date is required';
//     if (form.phone && !/^[0-9+\-\s()]{7,30}$/.test(form.phone)) er.phone = 'Invalid phone number';
//     setErrors(er);
//     return Object.keys(er).length === 0;
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     setMessage('');
//     if (!validate()) return;
//     setSaving(true);
//     try {
//       const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
//       if (isEdit) await updateEmployee(id, payload); else await createEmployee(payload);
//       navigate('/employees');
//     } catch (err) {
//       const data = err.response?.data;
//       if (data?.errors) setErrors(Object.fromEntries(data.errors.map((x) => [x.field, x.message])));
//       setMessage(data?.message || 'Could not save employee');
//     } finally { setSaving(false); }
//   };

//   return (
//     <div className="emp-page">
//       <h2>{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
//       {message && <div className="alert alert-error">{message}</div>}
//       <form className="emp-form" onSubmit={submit} noValidate>
//         <Field label="First name" required error={errors.first_name}>{input('first_name')}</Field>
//         <Field label="Last name" required error={errors.last_name}>{input('last_name')}</Field>
//         <Field label="Email" required error={errors.email}>{input('email', 'email')}</Field>
//         <Field label="Phone" error={errors.phone}>{input('phone')}</Field>
//         <Field label="National ID" error={errors.national_id}>{input('national_id')}</Field>
//         <Field label="Gender" error={errors.gender}>
//           <select value={form.gender} onChange={set('gender')}>
//             <option value="">Select...</option><option value="male">Male</option>
//             <option value="female">Female</option><option value="other">Other</option>
//           </select>
//         </Field>
//         <Field label="Date of birth" error={errors.date_of_birth}>{input('date_of_birth', 'date')}</Field>
//         <Field label="Hire date" required error={errors.hire_date}>{input('hire_date', 'date')}</Field>
//         <Field label="Department" error={errors.department_id}>
//           <select value={form.department_id}
//                   onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value, position_id: '' }))}>
//             <option value="">Select...</option>
//             {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//           </select>
//         </Field>
//         <Field label="Position" error={errors.position_id}>
//           <select value={form.position_id} onChange={set('position_id')}>
//             <option value="">Select...</option>
//             {visiblePositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
//           </select>
//         </Field>
//         <Field label="Manager / Supervisor" error={errors.manager_id}>
//           <select value={form.manager_id} onChange={set('manager_id')}>
//             <option value="">None</option>
//             {managers.filter((m) => String(m.id) !== String(id)).map((m) => (
//               <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
//             ))}
//           </select>
//         </Field>
//         <Field label="Address" error={errors.address}>{input('address')}</Field>
//         <div className="form-actions">
//           <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
//           <Link className="btn" to="/employees">Cancel</Link>
//         </div>
//       </form>
//     </div>
//   );
// }
