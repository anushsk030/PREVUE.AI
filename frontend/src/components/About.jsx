import { CheckCircle, Zap, Users, Target } from "lucide-react"
import styles from "./About.module.css"

export default function About({ onGetStarted }) {
  const features = [
    {
      icon: <Zap size={28} />,
      title: "AI-Powered Interviews",
      description: "Experience realistic interview scenarios with intelligent question generation"
    },
    {
      icon: <Target size={28} />,
      title: "Real-time Feedback",
      description: "Get instant analysis and suggestions to improve your interview skills"
    },
    {
      icon: <Users size={28} />,
      title: "Multi-role Support",
      description: "Practice for various positions from Frontend to Backend and more"
    },
    {
      icon: <CheckCircle size={28} />,
      title: "Track Progress",
      description: "Monitor your improvement over time with detailed performance metrics"
    }
  ]

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>About PREVUE.AI</h1>
          <p>Master your interview skills with AI-powered practice and real-time feedback</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className={styles.section}>
        <div className={styles.missionCard}>
          <div className={styles.missionContent}>
            <h2>Our Mission</h2>
            <p>
              At PREVUE.AI, we believe everyone deserves the opportunity to ace their interviews. 
              Our platform leverages cutting-edge AI technology to provide personalized, realistic 
              interview practice that helps you build confidence and land your dream job.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why Choose PREVUE.AI?</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsContainer}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Select Your Role</h3>
            <p>Choose the position and difficulty level you want to practice for</p>
          </div>
          <div className={styles.stepNumber} style={{ opacity: 0.3 }}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Start Interview</h3>
            <p>Answer AI-generated questions in a realistic interview environment</p>
          </div>
          <div className={styles.stepNumber} style={{ opacity: 0.3 }}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Get Feedback</h3>
            <p>Receive detailed analysis of your performance and suggestions for improvement</p>
          </div>
          <div className={styles.stepNumber} style={{ opacity: 0.3 }}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h3>Improve & Track</h3>
            <p>Monitor your progress and practice consistently to build confidence</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.section}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>10K+</div>
            <p>Active Users</p>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>500K+</div>
            <p>Interviews Completed</p>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>95%</div>
            <p>Success Rate</p>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>24/7</div>
            <p>Available</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Ready to Master Your Interviews?</h2>
          <p>Start practicing today and take the first step towards your dream job</p>
          <button className={styles.ctaButton} onClick={onGetStarted}>Get Started Now</button>
        </div>
      </section>
    </div>
  )
}
