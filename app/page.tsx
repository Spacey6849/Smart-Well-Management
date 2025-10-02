"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useUser } from '@/components/user-context';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

// Dynamically import to avoid SSR issues with THREE
const LiquidEther = dynamic(() => import('@/components/liquid-ether'), { ssr: false });
import { motion } from 'framer-motion';

// Temporary icons (could be replaced with lucide-react if present elsewhere in project)
const Icon = ({ children }: { children: React.ReactNode }) => (
	<span className="text-primary mr-2">{children}</span>
);

// Decide whether to show landing page or redirect based on an env flag
const LANDING_DISABLED = process.env.NEXT_PUBLIC_DISABLE_LANDING === '1';

export default function LandingPage() {
	if (LANDING_DISABLED) {
		// On the client, we can redirect imperatively
		redirect('/maps');
	}
	useTheme(); // ensure hydration theme hook
	return (
		<main className="min-h-screen w-full overflow-x-hidden">
			<Hero />
			<Features />
			<HowItWorks />
			<CTASection />
			<FAQ />
			<SiteFooter />
		</main>
	);
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
	return (
		<div className="mx-auto mb-12 max-w-2xl text-center">
			{eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
			<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
			{subtitle && <p className="mt-4 text-muted-foreground leading-relaxed">{subtitle}</p>}
		</div>
	);
}

function Hero() {
	const { user, loading } = useUser();
	return (
				<section className="relative flex flex-col items-center justify-center px-6 py-24 sm:px-8 min-h-[calc(100vh-5rem)]">
					<div className="absolute inset-0 -z-20 bg-background" />
					<div className="absolute inset-0 -z-10 opacity-[0.55] [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)]">
						<LiquidEther
							colors={[ '#5227FF', '#3b82f6', '#60a5fa' ]}
							autoDemo={true}
							autoSpeed={0.42}
							autoIntensity={2.1}
							cursorSize={120}
							resolution={0.6}
							mouseForce={18}
							takeoverDuration={0.25}
							autoResumeDelay={2600}
							autoRampDuration={0.8}
							className="pointer-events-none"
						/>
					</div>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
				className="mx-auto max-w-3xl text-center"
			>
				<span className="inline-block rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-primary/90 shadow-sm">Sustainable Water Intelligence</span>
				<h1 className="mt-6 bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
					EcoWell Platform
				</h1>
				<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
					Monitor groundwater health, predict trends, and act early. EcoWell unifies real-time metrics, predictive analytics, and an AI assistant to empower communities and administrators.
				</p>
						<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
					<Button asChild size="lg">
						<Link href="/setup/wells">Get Started</Link>
					</Button>
					<Button asChild size="lg" variant="outline">
						<Link href="/maps">View Map</Link>
					</Button>
							{!loading && !user && (
								<Button asChild size="lg" variant="ghost">
									<Link href="/login">Sign In</Link>
								</Button>
							)}
				</div>
			</motion.div>
		</section>
	);
}

const featureData: Array<{ title: string; desc: string; icon: string }> = [
	{ title: 'Real-time Monitoring', desc: 'Aggregate well metrics with instant status classification for clarity at a glance.', icon: '💧' },
	{ title: 'Predictive Analytics', desc: 'Forecast water level trends to anticipate shortages or anomalies early.', icon: '📈' },
	{ title: 'AI Assistant', desc: 'Ask natural-language questions about wells, risks, or interventions and get contextual answers.', icon: '🤖' },
	{ title: 'Route Planning', desc: 'Optimize physical inspection sequences by selecting only wells that matter today.', icon: '🗺️' },
	{ title: 'Well Management', desc: 'Register, rename, and organize wells with secure ownership-based access.', icon: '🛠️' },
	{ title: 'Security & Verification', desc: 'Email verification, session rotation, and strong credential handling built-in.', icon: '🔒' },
];

function Features() {
	return (
		<section className="px-6 py-20 sm:px-8" id="features">
			<SectionTitle
				eyebrow="Platform Features"
				title="Everything you need to safeguard groundwater"
				subtitle="From monitoring and prediction to decision support and field logistics."
			/>
			<div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{featureData.map(f => (
					<motion.div
						key={f.title}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="group relative rounded-lg border bg-card p-6 shadow-sm transition hover:shadow-md"
					>
						<div className="flex items-start gap-3">
							<div className="text-2xl">{f.icon}</div>
							<div>
								<h3 className="font-semibold tracking-tight">{f.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
							</div>
						</div>
						<div className="pointer-events-none absolute inset-0 rounded-lg ring-0 ring-primary/0 transition group-hover:ring-2 group-hover:ring-primary/30" />
					</motion.div>
				))}
			</div>
		</section>
	);
}

function HowItWorks() {
	const steps: Array<{ title: string; desc: string; icon: string }> = [
		{ title: '1. Create an Account', desc: 'Verify your email to unlock secure management for your wells.', icon: '🧾' },
		{ title: '2. Register Wells', desc: 'Add wells and begin collecting historical and live quality metrics.', icon: '📡' },
		{ title: '3. Monitor & Act', desc: 'Use analytics, forecasts, and AI guidance to intervene before issues escalate.', icon: '⚙️' },
	];
	return (
		<section className="bg-muted/40 px-6 py-24 sm:px-8" id="how-it-works">
			<SectionTitle
				eyebrow="How It Works"
				title="From data to actionable insight"
				subtitle="Onboarding takes minutes. Insights can save months of reactive effort."
			/>
			<div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
				{steps.map(step => (
					<motion.div
						key={step.title}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="relative rounded-lg border bg-background p-6 shadow-sm"
					>
						<div className="text-3xl">{step.icon}</div>
						<h3 className="mt-4 font-semibold tracking-tight">{step.title}</h3>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
					</motion.div>
				))}
			</div>
		</section>
	);
}

function CTASection() {
	return (
		<section className="relative overflow-hidden px-6 py-24 sm:px-8">
			<div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
				className="mx-auto max-w-3xl text-center"
			>
				<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to explore your groundwater intelligence?</h2>
				<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
					Start registering wells now or jump straight into the interactive map. Your data-driven workflow begins here.
				</p>
				<div className="mt-8 flex flex-wrap justify-center gap-4">
					<Button asChild size="lg">
						<Link href="/setup/wells">Register Wells</Link>
					</Button>
					<Button asChild size="lg" variant="outline">
						<Link href="/maps">Open Map</Link>
					</Button>
				</div>
			</motion.div>
		</section>
	);
}

function FAQ() {
	const items: Array<{ q: string; a: string }> = [
		{
			q: 'How accurate are the forecasts?',
			a: 'Forecasts use simple linear regression on recent water level data. They highlight directional trends rather than long-range guarantees.'
		},
		{
			q: 'What defines a critical well?',
			a: 'Thresholds flag wells with TDS > 1000 ppm, pH outside 6.5–8.5, or water level dropping below safe depth. Rules can evolve as data improves.'
		},
		{
			q: 'Is my data secure?',
			a: 'We use email verification, hashed credentials, and session rotation after sensitive changes. Future releases will add MFA.'
		},
		{
			q: 'Can I export my data?',
			a: 'Data export endpoints are planned. For now, you can query metrics via the dashboard and charts.'
		},
	];
	return (
		<section className="px-6 py-24 sm:px-8" id="faq">
			<SectionTitle eyebrow="FAQ" title="Answers to common questions" />
			<div className="mx-auto max-w-4xl divide-y rounded-lg border bg-card/50">
				{items.map((item, i) => (
					<details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
						<summary className="flex cursor-pointer items-center justify-between gap-4">
							<span className="font-medium tracking-tight">{item.q}</span>
							<span className="text-sm text-muted-foreground transition group-open:rotate-180">▼</span>
						</summary>
						<p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
						{i < items.length - 1 && <div className="mt-5 h-px w-full bg-border" />}
					</details>
				))}
			</div>
		</section>
	);
}

function SiteFooter() {
	return (
		<footer className="border-t bg-background/70 px-6 py-12 text-sm sm:px-8">
			<div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 md:flex-row md:items-center">
				<p className="text-muted-foreground">© {new Date().getFullYear()} EcoWell. All rights reserved.</p>
				<nav className="flex flex-wrap gap-4 text-muted-foreground">
					<Link className="hover:text-foreground" href="#features">Features</Link>
					<Link className="hover:text-foreground" href="#how-it-works">How It Works</Link>
					<Link className="hover:text-foreground" href="#faq">FAQ</Link>
					<Link className="hover:text-foreground" href="/login">Login</Link>
				</nav>
			</div>
		</footer>
	);
}
