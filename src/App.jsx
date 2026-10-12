import { useEffect, useState } from "react";
import "./App.css";

const BACKENDS = {
  python: {
    label: "Python API",
    url: "http://127.0.0.1:8000/api/v1/users",
  },
  node: {
    label: "Node API",
    url: "http://127.0.0.1:3000/api/v1/users",
  },
};

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join("; ")
      : detail;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

function UserManager({ backend }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    request(backend.url, { signal: controller.signal })
      .then(setUsers)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [backend.url]);

  function resetForm() {
    setForm({ name: "", email: "" });
    setEditingId(null);
  }

  async function refreshUsers() {
    setLoading(true);
    setError("");

    try {
      setUsers(await request(backend.url));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const editing = editingId !== null;
      const url = editing
        ? `${backend.url}/${editingId}`
        : backend.url;

      const saved = await request(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      setUsers((current) =>
        editing
          ? current.map((user) => (user.id === saved.id ? saved : user))
          : [...current, saved]
      );

      resetForm();
      setMessage(editing ? "User updated." : "User created.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function editUser(id) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      // Fetch the latest record using the Get by ID endpoint.
      const user = await request(`${backend.url}/${id}`);
      setEditingId(user.id);
      setForm({ name: user.name, email: user.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await request(`${backend.url}/${user.id}`, {
        method: "DELETE",
      });

      setUsers((current) =>
        current.filter((item) => item.id !== user.id)
      );

      if (editingId === user.id) resetForm();
      setMessage("User deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || loading;

  return (
    <section>
      <p className="api-address">{backend.url}</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}

      <form onSubmit={saveUser}>
        <h2>{editingId === null ? "Add user" : `Edit user ${editingId}`}</h2>

        <label>
          Name
          <input
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            required
            maxLength={100}
            disabled={disabled}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
            disabled={disabled}
          />
        </label>

        <div className="actions">
          <button disabled={disabled} type="submit">
            {busy
              ? "Please wait..."
              : editingId === null
                ? "Add user"
                : "Save changes"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              className="secondary"
              onClick={resetForm}
              disabled={disabled}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="list-heading">
        <h2>Users ({users.length})</h2>
        <button
          className="secondary"
          onClick={refreshUsers}
          disabled={disabled}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users loaded. Add one above or retry Refresh.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Created at (UTC)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.created_at || "Unknown"}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => editUser(user.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="danger"
                        disabled={disabled}
                        onClick={() => deleteUser(user)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [selected, setSelected] = useState("python");

  return (
    <main>
      <h1>Suro API Client</h1>
      <p>Test user management with either backend.</p>

      <label className="backend-picker">
        Backend
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {Object.entries(BACKENDS).map(([key, backend]) => (
            <option key={key} value={key}>
              {backend.label}
            </option>
          ))}
        </select>
      </label>

      <p>Python and Node store users in separate databases.</p>

      <UserManager key={selected} backend={BACKENDS[selected]} />
    </main>
  );
}