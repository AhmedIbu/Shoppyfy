import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setUser } from '../store/authSlice';
import { resetCart } from '../store/cartSlice';
import { resetWishlist } from '../store/wishlistSlice';
import { Address, User } from '../types';

interface AddressForm {
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const emptyAddress: AddressForm = {
  label: '',
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
  isDefault: false,
};

const sections = [
  { id: 'personal', icon: 'person', label: 'Personal Information' },
  { id: 'shipping', icon: 'local_shipping', label: 'Shipping Addresses' },
  { id: 'security', icon: 'lock', label: 'Security' },
];

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<AddressForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
    }
  }, [user]);

  const loadAddresses = () =>
    api
      .get<{ addresses: Address[] }>('/users/addresses')
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => undefined);

  useEffect(() => {
    loadAddresses();
  }, []);

  const saveProfile = async () => {
    setProfileMessage(null);
    try {
      const { data } = await api.patch<{ user: User }>('/users/profile', {
        firstName,
        lastName,
        email,
      });
      dispatch(setUser(data.user));
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileMessage(apiErrorMessage(err));
    }
  };

  const uploadAvatar = async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await api.post<{ user: User }>('/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(setUser(data.user));
    } catch (err) {
      setProfileMessage(apiErrorMessage(err));
    }
  };

  const saveAddress = async () => {
    if (!editing) return;
    setAddressMessage(null);
    const payload = {
      ...editing,
      label: editing.label || undefined,
      line2: editing.line2 || undefined,
      phone: editing.phone || undefined,
    };
    try {
      if (editingId) {
        await api.patch(`/users/addresses/${editingId}`, payload);
      } else {
        await api.post('/users/addresses', payload);
      }
      setEditing(null);
      setEditingId(null);
      loadAddresses();
    } catch (err) {
      setAddressMessage(apiErrorMessage(err));
    }
  };

  const deleteAddress = async (id: string) => {
    await api.delete(`/users/addresses/${id}`).catch(() => undefined);
    loadAddresses();
  };

  const setDefault = async (id: string) => {
    await api.patch(`/users/addresses/${id}`, { isDefault: true }).catch(() => undefined);
    loadAddresses();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete('/users/me');
      dispatch(logout());
      dispatch(resetCart());
      dispatch(resetWishlist());
      navigate('/');
    } catch (err) {
      setDeleteError(apiErrorMessage(err));
      setDeleting(false);
    }
  };

  const updatePassword = async () => {
    setSecurityMessage(null);
    if (newPassword !== confirmPassword) {
      setSecurityMessage('New passwords do not match');
      return;
    }
    try {
      await api.patch('/users/password', { currentPassword, newPassword });
      setSecurityMessage('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityMessage(apiErrorMessage(err));
    }
  };

  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const underlineInput =
    'w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:border-on-surface focus:ring-0 focus:outline-none text-body-md transition-colors';

  return (
    <main className="py-16 px-4 md:px-10 max-w-container mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="flex flex-col gap-8">
            <div className="flex lg:flex-col items-center lg:items-start gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-pill border border-outline-variant overflow-hidden bg-surface-container-highest flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-headline-sm text-on-surface-variant">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change avatar"
                  className="absolute bottom-0 right-0 bg-primary text-on-primary p-1.5 rounded-pill shadow-lg border border-surface transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                />
              </div>
              <div>
                <h1 className="font-display text-headline-sm">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-body-sm text-on-surface-variant">Member since {memberSince}</p>
                <p className="text-label-md uppercase text-primary mt-1">{user.role}</p>
              </div>
            </div>
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 gap-1 border-b lg:border-none border-outline-variant">
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={
                    i === 0
                      ? 'flex items-center gap-4 text-primary font-bold bg-surface-container-low rounded-xl p-3 shrink-0'
                      : 'flex items-center gap-4 text-on-surface-variant p-3 hover:bg-surface-container transition-all shrink-0'
                  }
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                  <span className="text-label-md uppercase">{s.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <section className="flex-1 space-y-12">
          {/* Personal info */}
          <div id="personal" className="bg-surface-container-lowest border border-outline-variant p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-display text-headline-sm">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">First Name</label>
                <input className={underlineInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">Last Name</label>
                <input className={underlineInput} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-label-md text-on-surface-variant uppercase">Email Address</label>
                <input type="email" className={underlineInput} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-outline-variant flex items-center justify-end gap-6">
              {profileMessage && <p className="text-body-sm text-primary">{profileMessage}</p>}
              <button
                onClick={saveProfile}
                className="bg-on-surface text-surface px-8 py-3 rounded-lg text-label-md uppercase hover:bg-primary transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Addresses */}
          <div id="shipping" className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="font-display text-headline-sm">Shipping Addresses</h2>
                <p className="text-body-sm text-on-surface-variant">Manage your delivery locations</p>
              </div>
              <button
                onClick={() => {
                  setEditing({ ...emptyAddress, fullName: `${user.firstName} ${user.lastName}` });
                  setEditingId(null);
                }}
                className="flex items-center gap-2 text-on-surface bg-surface border border-on-surface px-4 py-2 rounded-lg text-label-md uppercase hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined">add</span>
                Add New
              </button>
            </div>

            {editing && (
              <div className="border border-outline-variant p-6 rounded-xl bg-surface-container-lowest space-y-4">
                <h3 className="text-label-md uppercase">{editingId ? 'Edit Address' : 'New Address'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(
                    [
                      ['label', 'Label (Home, Work…)'],
                      ['fullName', 'Full Name'],
                      ['line1', 'Street Address'],
                      ['line2', 'Apt / Suite'],
                      ['city', 'City'],
                      ['state', 'State'],
                      ['postalCode', 'Zip Code'],
                      ['phone', 'Phone'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-label-md text-on-surface-variant uppercase">{label}</label>
                      <input
                        className={underlineInput}
                        value={editing[key]}
                        onChange={(e) => setEditing((f) => f && { ...f, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-3 text-body-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={editing.isDefault}
                    onChange={(e) => setEditing((f) => f && { ...f, isDefault: e.target.checked })}
                    className="rounded-none text-primary focus:ring-0"
                  />
                  Set as default address
                </label>
                {addressMessage && <p className="text-body-sm text-error">{addressMessage}</p>}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={saveAddress}
                    className="bg-on-surface text-surface px-6 py-2.5 rounded-lg text-label-md uppercase hover:bg-primary transition-all"
                  >
                    Save Address
                  </button>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setEditingId(null);
                    }}
                    className="text-label-md uppercase text-on-surface-variant hover:text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className={`group p-6 rounded-xl relative bg-surface-container-lowest transition-colors ${
                    a.isDefault ? 'border-2 border-primary' : 'border border-outline-variant hover:border-on-surface'
                  }`}
                >
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => {
                        setEditing({
                          label: a.label ?? '',
                          fullName: a.fullName,
                          line1: a.line1,
                          line2: a.line2 ?? '',
                          city: a.city,
                          state: a.state,
                          postalCode: a.postalCode,
                          country: a.country,
                          phone: a.phone ?? '',
                          isDefault: a.isDefault,
                        });
                        setEditingId(a.id);
                      }}
                      aria-label="Edit address"
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => deleteAddress(a.id)}
                      aria-label="Delete address"
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                  {a.isDefault && (
                    <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-pill uppercase tracking-wider mb-4 inline-block font-semibold">
                      Default
                    </span>
                  )}
                  <h3 className={`text-label-md uppercase mb-2 ${!a.isDefault ? 'pt-6' : ''}`}>
                    {a.label ?? 'Address'}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {a.fullName}
                    <br />
                    {a.line1}
                    {a.line2 && (
                      <>
                        , {a.line2}
                      </>
                    )}
                    <br />
                    {a.city}, {a.state} {a.postalCode}
                  </p>
                  {!a.isDefault && (
                    <button
                      onClick={() => setDefault(a.id)}
                      className="mt-4 text-primary text-[11px] uppercase font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div id="security" className="bg-surface-container-lowest border border-outline-variant p-8 rounded-xl shadow-sm">
            <h2 className="font-display text-headline-sm mb-2">Security</h2>
            <p className="text-body-sm text-on-surface-variant mb-8">
              Update your password and manage account safety
            </p>
            <div className="space-y-6 max-w-md">
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={underlineInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-0 top-2 text-on-surface-variant"
                    aria-label="Toggle visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showCurrent ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={underlineInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={underlineInput}
                />
              </div>
              {securityMessage && <p className="text-body-sm text-primary">{securityMessage}</p>}
              <button
                onClick={updatePassword}
                className="w-full md:w-auto bg-on-surface text-surface px-8 py-3 rounded-lg text-label-md uppercase hover:bg-primary transition-all mt-4"
              >
                Update Password
              </button>
            </div>
            <div className="mt-12 p-6 border border-error-container rounded-lg bg-error-container/10">
              <h4 className="text-label-md uppercase text-error mb-2">Danger Zone</h4>
              <p className="text-body-sm text-on-surface-variant mb-4">
                Once you delete your account there is no going back. Type <strong>DELETE</strong> below to confirm.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(null); }}
                  placeholder="Type DELETE to confirm"
                  className="flex-1 border border-error bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-error"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="text-error text-label-md uppercase border border-error px-4 py-2 rounded-lg hover:bg-error hover:text-on-error transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
              {deleteError && <p className="mt-2 text-body-sm text-error">{deleteError}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
