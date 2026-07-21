import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Download,
  Zap,
  Building2,
  Star,
  Calendar,
} from "lucide-react";
import { Button, Badge, Alert } from "@/components/ui";
import { cn } from "@/utils/cn";
import { companyService } from "@/services/companyService";

const PLAN_PRICES = { FREE: 0, STARTER: 2999, GROWTH: 7999, ENTERPRISE: 19999 };

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: 2999,
    features: ["3 active jobs", "50 views/month", "Basic ATS", "Email support"],
    icon: Zap,
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: 7999,
    popular: true,
    features: [
      "10 active jobs",
      "Unlimited views",
      "Full ATS",
      "Analytics",
      "Verified badge",
      "Priority support",
    ],
    icon: Building2,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 19999,
    features: [
      "Unlimited jobs",
      "Custom integrations",
      "Dedicated manager",
      "Custom reports",
      "SLA",
    ],
    icon: Star,
  },
];

function unwrapData(res, fallback = null) {
  return res?.data?.data ?? res?.data ?? res ?? fallback;
}

function toArray(value) {
  const data = unwrapData(value, []);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.history)) return data.history;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.transactions)) return data.transactions;
  return [];
}

function normalizeSubscription(value) {
  const data = unwrapData(value, {}) || {};
  const subscription = data.subscription || data;
  const rawPlan =
    subscription?.plan?.id ||
    subscription?.plan?.name ||
    subscription?.plan ||
    data?.plan ||
    "FREE";
  const plan = String(rawPlan || "FREE").toUpperCase();
  return {
    plan,
    status: subscription?.status || "active",
    amount: Number(subscription?.amount || PLAN_PRICES[plan] || 0),
    currency: subscription?.currency || "NPR",
    renewalDate: subscription?.renewalDate || subscription?.renewsAt || null,
  };
}

export default function Billing() {
  const queryClient = useQueryClient();

  const {
    data: subData,
    isLoading,
    isError: isSubscriptionError,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: ["company", "subscription"],
    queryFn: () => companyService.getSubscription(),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: billingData,
    isError: isBillingError,
    error: billingError,
    refetch: refetchBilling,
  } = useQuery({
    queryKey: ["company", "billing"],
    queryFn: () => companyService.getBillingHistory(),
    staleTime: 1000 * 60 * 5,
  });

  const upgradeMutation = useMutation({
    mutationFn: (plan) => companyService.updateSubscription(plan),
    onSuccess: () => queryClient.invalidateQueries(["company", "subscription"]),
  });

  const subscription = normalizeSubscription(subData);
  const currentPlan = subscription.plan || "FREE";
  const invoices = toArray(billingData);
  const hasError = isSubscriptionError || isBillingError;

  useEffect(() => {
    if (isSubscriptionError)
      console.error("BILLING_LOAD_ERROR:", subscriptionError);
    if (isBillingError) console.error("BILLING_LOAD_ERROR:", billingError);
  }, [isSubscriptionError, subscriptionError, isBillingError, billingError]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-slate-100 rounded w-64" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 bg-white border border-slate-200 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const planPrice = Number(
    subscription.amount || PLAN_PRICES[currentPlan] || 0,
  );

  if (hasError) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Billing & Subscription
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your plan and payment information
          </p>
        </div>
        <Alert
          type="error"
          title="Could not load billing information"
          message={
            subscriptionError?.message ||
            billingError?.message ||
            "Please try again."
          }
        />
        <Button
          variant="outline"
          onClick={() => {
            refetchSubscription();
            refetchBilling();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Billing & Subscription
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your plan and payment information
        </p>
      </div>

      {upgradeMutation.isSuccess && (
        <Alert type="success" message="Plan updated successfully!" />
      )}

      {/* Current Plan */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm">Current Plan</p>
            <h2 className="text-2xl font-bold mt-1">{currentPlan} Plan</h2>
            {subscription?.renewalDate && (
              <p className="text-blue-200 text-sm mt-2 flex items-center gap-1.5">
                <Calendar size={14} /> Renews{" "}
                {new Date(subscription.renewalDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="text-right">
            {planPrice > 0 ? (
              <>
                <p className="text-3xl font-bold">
                  NPR {Number(planPrice || 0).toLocaleString()}
                </p>
                <p className="text-blue-200 text-sm">/month</p>
              </>
            ) : (
              <p className="text-2xl font-bold">Free</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-blue-700 hover:bg-blue-50"
            onClick={() => upgradeMutation.mutate("GROWTH")}
            disabled={upgradeMutation.isPending}
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative bg-white rounded-xl border-2 p-5",
                  plan.popular ? "border-blue-500" : "border-slate-200",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary" size="xs">
                      Popular
                    </Badge>
                  </div>
                )}
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon size={18} className="text-blue-600" />
                </div>
                <p className="font-bold text-slate-900">{plan.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  NPR {plan.price.toLocaleString()}
                  <span className="text-sm font-normal text-slate-500">
                    /mo
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.slice(0, 4).map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-1.5 text-xs text-slate-600"
                    >
                      <CheckCircle2
                        size={11}
                        className="text-emerald-500 shrink-0"
                      />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={
                    isCurrent
                      ? "secondary"
                      : plan.popular
                        ? "primary"
                        : "outline"
                  }
                  size="sm"
                  fullWidth
                  className="mt-4"
                  disabled={isCurrent || upgradeMutation.isPending}
                  onClick={() => !isCurrent && upgradeMutation.mutate(plan.id)}
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Billing History
          </h3>
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No billing history yet. Billing integration is not fully configured.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv?.plan || "Free"} Plan
                  </p>
                  <p className="text-xs text-slate-500">
                    {inv?.date || inv?.createdAt || "No date"} ·{" "}
                    {inv?.id || `invoice-${i + 1}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" size="xs">
                    Paid
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">
                    NPR {Number(inv?.amount || 0).toLocaleString()}
                  </span>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
