import { Document, Page, Text, View, Link, StyleSheet } from '@react-pdf/renderer'
import { formatDateRange, normalizeUrl } from '@/utils/formatters'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#0f172a', fontSize: 10, lineHeight: 1.35, backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 10, marginBottom: 14 },
  name: { fontSize: 24, fontWeight: 700, color: '#0f172a' },
  title: { fontSize: 11, color: '#475569', marginTop: 3 },
  contact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, color: '#475569', fontSize: 9 },
  link: { color: '#1d4ed8', fontSize: 9, textDecoration: 'none' },
  section: { marginBottom: 12 },
  heading: { fontSize: 10, color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  paragraph: { color: '#334155' },
  item: { marginBottom: 8 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemTitle: { fontSize: 10.5, fontWeight: 700, color: '#0f172a' },
  muted: { color: '#64748b', fontSize: 9 },
  description: { color: '#334155', marginTop: 3 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, fontSize: 9 },
})

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

function hasAny(obj, keys) {
  return keys.some((key) => String(obj?.[key] || '').trim())
}

export default function ResumePDFDocument({ data }) {
  const experience = list(data.experience).filter((exp) => hasAny(exp, ['role', 'company', 'startDate', 'endDate', 'description']))
  const education = list(data.education).filter((edu) => hasAny(edu, ['degree', 'institution', 'startYear', 'endYear']))
  const skills = list(data.skills)
  const projects = list(data.projects).filter((project) => hasAny(project, ['name', 'description', 'technologies', 'link']))
  const certifications = list(data.certifications).filter((cert) => hasAny(cert, ['name', 'issuer', 'issueDate', 'credentialUrl']))

  const portfolioUrl = normalizeUrl(data.portfolio)
  const textContacts = [data.email, data.phone, data.location].filter(Boolean)

  return (
    <Document title={`LocalSkill Resume - ${data.name || 'User'}`} author="LocalSkill">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || 'Your Name'}</Text>
          {data.title ? <Text style={styles.title}>{data.title}</Text> : null}
          {(textContacts.length > 0 || portfolioUrl) ? (
            <View style={styles.contact}>
              {textContacts.map((contact) => <Text key={contact}>{contact}</Text>)}
              {portfolioUrl ? (
                <Link src={portfolioUrl} style={styles.link}>{data.portfolio}</Link>
              ) : null}
            </View>
          ) : null}
        </View>

        {data.summary ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Summary</Text>
            <Text style={styles.paragraph}>{data.summary}</Text>
          </View>
        ) : null}

        {experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Experience</Text>
            {experience.map((exp, index) => (
              <View key={`${exp.role}-${index}`} style={styles.item}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{exp.role || 'Role'}</Text>
                  <Text style={styles.muted}>{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</Text>
                </View>
                {exp.company ? <Text style={styles.muted}>{exp.company}</Text> : null}
                {exp.description ? <Text style={styles.description}>{exp.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Education</Text>
            {education.map((edu, index) => (
              <View key={`${edu.degree}-${index}`} style={styles.item}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{edu.degree || 'Degree'}</Text>
                  <Text style={styles.muted}>{formatDateRange(edu.startYear, edu.endYear, false)}</Text>
                </View>
                {edu.institution ? <Text style={styles.muted}>{edu.institution}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Skills</Text>
            <View style={styles.skills}>{skills.map((skill) => <Text key={skill} style={styles.chip}>{skill}</Text>)}</View>
          </View>
        ) : null}

        {projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Projects</Text>
            {projects.map((project, index) => {
              const projectLink = normalizeUrl(project.link)
              return (
                <View key={`${project.name}-${index}`} style={styles.item}>
                  <View style={styles.itemTop}>
                    {project.name ? <Text style={styles.itemTitle}>{project.name}</Text> : null}
                    {projectLink ? <Link src={projectLink} style={styles.link}>{project.link}</Link> : null}
                  </View>
                  {project.technologies ? <Text style={styles.muted}>{project.technologies}</Text> : null}
                  {project.description ? <Text style={styles.description}>{project.description}</Text> : null}
                </View>
              )
            })}
          </View>
        ) : null}

        {certifications.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Certifications</Text>
            {certifications.map((cert, index) => {
              const credentialUrl = normalizeUrl(cert.credentialUrl)
              return (
                <View key={`${cert.name}-${index}`} style={styles.item}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemTitle}>{cert.name || 'Certification'}</Text>
                    {cert.issueDate ? <Text style={styles.muted}>{cert.issueDate}</Text> : null}
                  </View>
                  {cert.issuer ? <Text style={styles.muted}>{cert.issuer}</Text> : null}
                  {credentialUrl ? <Link src={credentialUrl} style={styles.link}>{cert.credentialUrl}</Link> : null}
                </View>
              )
            })}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
