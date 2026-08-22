import { requireStaff } from "@/lib/auth";
import { Nav } from "@/components/nav";
import {
  addCarrier,
  addLoad,
  deletePortalUser,
  updateCarrierSettings,
} from "./actions";

export default async function AdminPage() {
  const { supabase, profile } = await requireStaff();

  const { data: carriersData } = await supabase
    .from("carriers")
    .select("*")
    .order("company_name");
  const carriers = carriersData || [];

  const { data: driversData } = await supabase
    .from("drivers")
    .select("id, full_name, carrier_id")
    .eq("status", "active")
    .order("full_name");

  const { data: trucksData } = await supabase
    .from("trucks")
    .select("id, unit_number, carrier_id")
    .eq("status", "active")
    .order("unit_number");

  const portalUsers =
    profile.role === "admin"
      ? (
          (
            await supabase
              .from("profiles")
              .select("id, full_name, email, role, carrier_id, status")
              .neq("id", profile.id)
              .order("full_name")
          ).data || []
        ).filter((user) => user.role !== "admin")
      : [];

  const carrierNames = new Map(
    carriers.map((carrier) => [carrier.id, carrier.company_name])
  );

  return (
    <>
      <Nav profile={profile} />
      <main className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">FFS premium administration</div>
            <h1>Carrier Command Center</h1>
          </div>
        </div>

        <section className="grid admin-layout">
          <div className="card">
            <div className="eyebrow">Premium portal onboarding</div>
            <h2>Add carrier</h2>

            {profile.role === "admin" ? (
              <form action={addCarrier} className="form">
                <label>
                  Company name
                  <input name="company_name" required />
                </label>

                <div className="form-grid">
                  <label>
                    Carrier code
                    <input name="carrier_code" placeholder="ABC" required />
                  </label>
                  <label>
                    Load fee %
                    <input
                      type="number"
                      name="fee_percentage"
                      step="0.01"
                      defaultValue="5"
                      required
                    />
                  </label>
                  <label>
                    MC number
                    <input name="mc_number" />
                  </label>
                  <label>
                    USDOT
                    <input name="dot_number" />
                  </label>
                  <label>
                    Owner / primary contact
                    <input name="contact_name" required />
                  </label>
                  <label>
                    Phone
                    <input name="phone" />
                  </label>
                  <label>
                    Login email
                    <input type="email" name="email" required />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      name="temporary_password"
                      minLength={8}
                      required
                    />
                  </label>
                </div>

                <button className="button secondary">
                  Create premium carrier portal
                </button>
              </form>
            ) : (
              <p className="muted">
                Only FFS administrators can create carrier accounts.
              </p>
            )}
          </div>

          <div>
            <h2>Portal carriers</h2>
            <div className="grid">
              {carriers.map((carrier) => (
                <div className="card" key={carrier.id}>
                  <div className="eyebrow">
                    {carrier.carrier_code} · {carrier.portal_plan}
                  </div>
                  <h2>{carrier.company_name}</h2>
                  <p>
                    {carrier.contact_name}
                    <br />
                    {carrier.email}
                  </p>

                  <div className="metric-strip">
                    <span>
                      {(Number(carrier.fee_rate || 0) * 100).toFixed(2)}% fee
                    </span>
                    <span>{carrier.status}</span>
                  </div>

                  {profile.role === "admin" && (
                    <form
                      action={updateCarrierSettings}
                      className="form section"
                    >
                      <input
                        type="hidden"
                        name="carrier_id"
                        value={carrier.id}
                      />

                      <div className="form-grid">
                        <label>
                          Fee %
                          <input
                            type="number"
                            step="0.01"
                            name="fee_percentage"
                            defaultValue={(
                              Number(carrier.fee_rate || 0) * 100
                            ).toFixed(2)}
                          />
                        </label>
                        <label>
                          Plan
                          <select
                            name="portal_plan"
                            defaultValue={carrier.portal_plan}
                          >
                            <option value="premium">Premium</option>
                            <option value="standard">Standard</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </label>
                        <label>
                          Status
                          <select name="status" defaultValue={carrier.status}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </label>
                        <label>
                          Notification email
                          <input
                            type="email"
                            name="notification_email"
                            defaultValue={
                              carrier.notification_email || carrier.email || ""
                            }
                          />
                        </label>
                        <label>
                          Billing email
                          <input
                            type="email"
                            name="billing_email"
                            defaultValue={
                              carrier.billing_email || carrier.email || ""
                            }
                          />
                        </label>
                      </div>

                      <label>
                        <span>Automated weekly reports</span>
                        <input
                          style={{ width: 22 }}
                          type="checkbox"
                          name="weekly_report_enabled"
                          defaultChecked={carrier.weekly_report_enabled}
                        />
                      </label>

                      <label>
                        <span>Automated monthly reports</span>
                        <input
                          style={{ width: 22 }}
                          type="checkbox"
                          name="monthly_report_enabled"
                          defaultChecked={carrier.monthly_report_enabled}
                        />
                      </label>

                      <label>
                        Notes
                        <textarea
                          name="notes"
                          defaultValue={carrier.notes || ""}
                        />
                      </label>

                      <button className="button small">
                        Save carrier settings
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {profile.role === "admin" && (
          <section className="card section">
            <div className="eyebrow">Portal access control</div>
            <h2>Delete portal user</h2>
            <p className="muted">
              This removes the selected login only. It does not delete the
              carrier, loads, documents, reports, invoices, trucks, or driver
              record.
            </p>

            {portalUsers.length > 0 ? (
              <form action={deletePortalUser} className="form">
                <label>
                  Portal user
                  <select name="user_id" required defaultValue="">
                    <option value="" disabled>
                      Select a portal login
                    </option>
                    {portalUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} — {user.email} (
                        {user.role.replaceAll("_", " ")})
                        {user.carrier_id
                          ? ` · ${
                              carrierNames.get(user.carrier_id) ||
                              "Unknown carrier"
                            }`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type DELETE to confirm
                  <input
                    name="confirmation"
                    placeholder="DELETE"
                    pattern="DELETE"
                    autoComplete="off"
                    required
                  />
                </label>

                <button className="button danger">
                  Permanently delete portal login
                </button>
              </form>
            ) : (
              <p className="muted">There are no deletable portal users.</p>
            )}
          </section>
        )}

        <section className="card section">
          <div className="eyebrow">Load operations</div>
          <h2>Add expanded load</h2>

          <form action={addLoad} className="form">
            <label>
              Carrier
              <select name="carrier_id" required>
                {carriers.map((carrier) => (
                  <option value={carrier.id} key={carrier.id}>
                    {carrier.company_name} ({carrier.carrier_code})
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid three">
              <label>
                Load number
                <input name="load_number" placeholder="OLO-005" required />
              </label>
              <label>
                Date booked
                <input type="date" name="date_booked" required />
              </label>
              <label>
                Broker
                <input name="broker" required />
              </label>
              <label>
                Broker PO / Load #
                <input name="broker_load_number" />
              </label>
              <label>
                Rate
                <input type="number" step="0.01" name="rate" required />
              </label>
              <label>
                Status
                <select name="status">
                  <option>Booked</option>
                  <option>Picked Up / In Transit</option>
                  <option>Delivered</option>
                  <option>Not Taken</option>
                  <option>Canceled</option>
                </select>
              </label>
              <label>
                Pickup location
                <input name="pickup_location" required />
              </label>
              <label>
                Pickup date
                <input type="date" name="pickup_date" required />
              </label>
              <label>
                Pickup time
                <input type="time" name="pickup_time" />
              </label>
              <label>
                Delivery location
                <input name="delivery_location" required />
              </label>
              <label>
                Delivery date
                <input type="date" name="delivery_date" required />
              </label>
              <label>
                Delivery time
                <input type="time" name="delivery_time" />
              </label>
              <label>
                Commodity
                <input name="commodity" />
              </label>
              <label>
                Weight
                <input type="number" name="weight" />
              </label>
              <label>
                Equipment
                <input name="equipment_type" />
              </label>
              <label>
                Loaded miles
                <input type="number" step="0.1" name="miles_loaded" />
              </label>
              <label>
                Deadhead miles
                <input type="number" step="0.1" name="miles_deadhead" />
              </label>
              <label>
                Driver
                <select name="driver_id">
                  <option value="">Unassigned</option>
                  {(driversData || []).map((driver) => (
                    <option value={driver.id} key={driver.id}>
                      {driver.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Truck
                <select name="truck_id">
                  <option value="">Unassigned</option>
                  {(trucksData || []).map((truck) => (
                    <option value={truck.id} key={truck.id}>
                      {truck.unit_number}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Counts toward revenue</span>
              <input
                style={{ width: 22 }}
                name="counts_toward_revenue"
                type="checkbox"
                defaultChecked
              />
            </label>

            <label>
              Notes
              <textarea name="notes" />
            </label>

            <button className="button secondary">
              Add load and notify carrier
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
