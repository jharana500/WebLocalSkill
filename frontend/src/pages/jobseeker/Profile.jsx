import { useState, useRef } from "react";
import {
  Briefcase,
  GraduationCap,
  Award,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Link2,
  X,
  Camera,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Avatar, Alert } from "@/components/ui";
import { Input, Textarea } from "@/components/ui/Input";
import useAuthStore from "@/store/authStore";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";

function Section({ icon: Icon, title, action, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon size={16} className="text-blue-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={onSave}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-5">
      <div className="h-8 bg-slate-100 rounded w-48" />
      <div className="bg-white border border-slate-200 rounded-xl p-6 h-40" />
      <div className="bg-white border border-slate-200 rounded-xl p-6 h-28" />
      <div className="bg-white border border-slate-200 rounded-xl p-6 h-36" />
    </div>
  );
}

const BLANK_EXP = {
  role: "",
  company: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
};
const BLANK_EDU = {
  degree: "",
  institution: "",
  startYear: "",
  endYear: "",
  grade: "",
};
const BLANK_CERT = { name: "", issuer: "", year: "" };

export default function Profile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef();
  const [newSkill, setNewSkill] = useState("");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => userService.getProfile(),
    staleTime: 1000 * 60 * 5,
  });

  const profile = data?.profile || data;
  const userEmail = data?.user?.email || user?.email || "";
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    userEmail;

  const invalidate = () => queryClient.invalidateQueries(["user", "profile"]);

  const updateMutation = useMutation({
    mutationFn: (payload) => userService.updateProfile(payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => userService.uploadAvatar(file),
    onSuccess: invalidate,
  });

  const addSkillMutation = useMutation({
    mutationFn: (skill) => userService.addSkill(skill),
    onSuccess: () => {
      invalidate();
      setNewSkill("");
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skill) => userService.removeSkill(skill),
    onSuccess: invalidate,
  });

  const addExpMutation = useMutation({
    mutationFn: (payload) => userService.addExperience(payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, ...payload }) =>
      userService.updateExperience(id, payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const removeExpMutation = useMutation({
    mutationFn: (id) => userService.removeExperience(id),
    onSuccess: invalidate,
  });

  const addEduMutation = useMutation({
    mutationFn: (payload) => userService.addEducation(payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateEduMutation = useMutation({
    mutationFn: ({ id, ...payload }) =>
      userService.updateEducation(id, payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const removeEduMutation = useMutation({
    mutationFn: (id) => userService.removeEducation(id),
    onSuccess: invalidate,
  });

  const addCertMutation = useMutation({
    mutationFn: (payload) => userService.addCertification(payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const removeCertMutation = useMutation({
    mutationFn: (id) => userService.removeCertification(id),
    onSuccess: invalidate,
  });

  const openModal = (type, item = null) => {
    setModal(type);
    setEditId(item?.id || null);
    setForm(item ? { ...item } : {});
  };

  const closeModal = () => {
    setModal(null);
    setEditId(null);
    setForm({});
  };

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleModalSave = () => {
    if (modal === "basic") {
      updateMutation.mutate(form);
    } else if (modal === "exp") {
      if (editId) updateExpMutation.mutate({ id: editId, ...form });
      else addExpMutation.mutate(form);
    } else if (modal === "edu") {
      if (editId) updateEduMutation.mutate({ id: editId, ...form });
      else addEduMutation.mutate(form);
    } else if (modal === "cert") {
      addCertMutation.mutate(form);
    }
  };

  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    addSkillMutation.mutate(skill);
  };

  const openBasicModal = () => {
    openModal("basic");
    setForm({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      title: profile?.title || "",
      phone: profile?.phone || "",
      district: profile?.district || "",
      bio: profile?.bio || "",
      linkedin: profile?.linkedin || "",
      github: profile?.github || "",
      website: profile?.website || "",
    });
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Alert
          type="error"
          message="Failed to load profile. Please try again."
        />
      </div>
    );
  }

  const skills = profile?.skills || [];
  const experience = profile?.experience || [];
  const education = profile?.education || [];
  const certifications = profile?.certifications || [];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <Button
          variant="outline"
          size="sm"
          icon={Edit2}
          onClick={openBasicModal}
        >
          Edit Profile
        </Button>
      </div>

      <div className="space-y-5">
        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
                />
              ) : (
                <Avatar name={fullName} size="2xl" />
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              >
                <Camera size={11} />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files[0])
                    avatarMutation.mutate(e.target.files[0]);
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {fullName || "Your Name"}
                  </h2>
                  {profile?.title && (
                    <p className="text-slate-600 mt-1 font-medium">
                      {profile.title}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                    {profile?.district && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} /> {profile.district}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} /> {userEmail}
                    </span>
                    {profile?.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={14} /> {profile.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {profile?.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <Link2 size={16} />
                    </a>
                  )}
                  {profile?.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <Link2 size={16} />
                    </a>
                  )}
                  {profile?.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <Globe size={16} />
                    </a>
                  )}
                </div>
              </div>
              {profile?.bio && (
                <p className="text-sm text-slate-600 mt-4 leading-relaxed max-w-xl">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Skills */}
        <Section
          icon={Award}
          title="Skills"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => openModal("add-skill")}
            >
              Add Skill
            </Button>
          }
        >
          {skills.length === 0 && (
            <p className="text-sm text-slate-400">
              No skills added yet. Add skills to improve your profile.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill}
                className="group flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full"
              >
                {skill}
                <button
                  onClick={() => removeSkillMutation.mutate(skill)}
                  className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => openModal("add-skill")}
              className="flex items-center gap-1.5 border border-dashed border-slate-300 text-slate-500 text-sm px-3 py-1.5 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus size={13} /> Add skill
            </button>
          </div>
        </Section>

        {/* Experience */}
        <Section
          icon={Briefcase}
          title="Work Experience"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => openModal("exp", { ...BLANK_EXP })}
            >
              Add Experience
            </Button>
          }
        >
          {experience.length === 0 && (
            <p className="text-sm text-slate-400">No experience added yet.</p>
          )}
          <div className="space-y-5">
            {experience.map((exp, i) => {
              const start = exp.startDate
                ? new Date(exp.startDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })
                : "";
              const end = exp.isCurrent
                ? "Present"
                : exp.endDate
                  ? new Date(exp.endDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })
                  : "";
              const duration =
                [start, end].filter(Boolean).join(" – ") || exp.duration || "";
              return (
                <div
                  key={exp.id || i}
                  className={cn(
                    "flex gap-4",
                    i < experience.length - 1 &&
                      "pb-5 border-b border-slate-100",
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Briefcase size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {exp.role}
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {exp.company}
                        </p>
                        {duration && (
                          <p className="text-xs text-slate-400 mt-1">
                            {duration}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openModal("exp", exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => removeExpMutation.mutate(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Education */}
        <Section
          icon={GraduationCap}
          title="Education"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => openModal("edu", { ...BLANK_EDU })}
            >
              Add Education
            </Button>
          }
        >
          {education.length === 0 && (
            <p className="text-sm text-slate-400">No education added yet.</p>
          )}
          <div className="space-y-4">
            {education.map((edu, i) => (
              <div key={edu.id || i} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <GraduationCap size={16} className="text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {edu.degree}
                      </p>
                      <p className="text-sm text-slate-600">
                        {edu.institution}
                      </p>
                      {(edu.startYear || edu.endYear) && (
                        <p className="text-xs text-slate-400 mt-1">
                          {edu.startYear} – {edu.endYear}
                          {edu.grade ? ` · ${edu.grade}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openModal("edu", edu)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => removeEduMutation.mutate(edu.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Certifications */}
        <Section
          icon={Award}
          title="Certifications"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => openModal("cert", { ...BLANK_CERT })}
            >
              Add Certification
            </Button>
          }
        >
          {certifications.length === 0 && (
            <p className="text-sm text-slate-400">
              No certifications added yet.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {certifications.map((cert, i) => (
              <div
                key={cert.id || i}
                className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Award size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {cert.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cert.issuer}
                    {cert.year ? ` · ${cert.year}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeCertMutation.mutate(cert.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Add Skill inline modal */}
      {modal === "add-skill" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Add Skill
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <Input
              label="Skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g. React, Python, Figma"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSkill();
                  closeModal();
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                loading={addSkillMutation.isPending}
                onClick={() => {
                  handleAddSkill();
                  if (!addSkillMutation.isPending) closeModal();
                }}
                disabled={!newSkill.trim()}
              >
                Add Skill
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Basic Info Modal */}
      {modal === "basic" && (
        <Modal
          title="Edit Profile"
          onClose={closeModal}
          onSave={handleModalSave}
          saving={updateMutation.isPending}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName || ""}
              onChange={set("firstName")}
            />
            <Input
              label="Last Name"
              value={form.lastName || ""}
              onChange={set("lastName")}
            />
          </div>
          <Input
            label="Professional Title"
            value={form.title || ""}
            onChange={set("title")}
            placeholder="e.g. Senior React Developer"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone || ""}
              onChange={set("phone")}
            />
            <Input
              label="District / Location"
              value={form.district || ""}
              onChange={set("district")}
            />
          </div>
          <Textarea
            label="Bio"
            rows={3}
            value={form.bio || ""}
            onChange={set("bio")}
          />
          <Input
            label="LinkedIn URL"
            value={form.linkedin || ""}
            onChange={set("linkedin")}
            placeholder="https://linkedin.com/in/..."
          />
          <Input
            label="GitHub URL"
            value={form.github || ""}
            onChange={set("github")}
            placeholder="https://github.com/..."
          />
          <Input
            label="Website"
            value={form.website || ""}
            onChange={set("website")}
            placeholder="https://yourwebsite.com"
          />
        </Modal>
      )}

      {/* Add/Edit Experience Modal */}
      {modal === "exp" && (
        <Modal
          title={editId ? "Edit Experience" : "Add Experience"}
          onClose={closeModal}
          onSave={handleModalSave}
          saving={addExpMutation.isPending || updateExpMutation.isPending}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              value={form.role || ""}
              onChange={set("role")}
              placeholder="e.g. Frontend Developer"
            />
            <Input
              label="Company"
              value={form.company || ""}
              onChange={set("company")}
              placeholder="e.g. Cotiviti Nepal"
            />
            <Input
              label="Start Date"
              type="month"
              value={form.startDate ? form.startDate.slice(0, 7) : ""}
              onChange={set("startDate")}
            />
            <div>
              <Input
                label="End Date"
                type="month"
                value={form.endDate ? form.endDate.slice(0, 7) : ""}
                onChange={set("endDate")}
                disabled={form.isCurrent}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCurrent || false}
                  onChange={setCheck("isCurrent")}
                  className="rounded border-slate-300 accent-blue-600"
                />
                <span className="text-xs text-slate-600">
                  Currently working here
                </span>
              </label>
            </div>
          </div>
          <Textarea
            label="Description"
            rows={3}
            value={form.description || ""}
            onChange={set("description")}
          />
        </Modal>
      )}

      {/* Add/Edit Education Modal */}
      {modal === "edu" && (
        <Modal
          title={editId ? "Edit Education" : "Add Education"}
          onClose={closeModal}
          onSave={handleModalSave}
          saving={addEduMutation.isPending || updateEduMutation.isPending}
        >
          <Input
            label="Degree / Qualification"
            value={form.degree || ""}
            onChange={set("degree")}
            placeholder="e.g. B.Sc. Computer Science"
          />
          <Input
            label="Institution"
            value={form.institution || ""}
            onChange={set("institution")}
            placeholder="e.g. Tribhuvan University"
          />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Start Year"
              value={form.startYear || ""}
              onChange={set("startYear")}
              placeholder="2018"
            />
            <Input
              label="End Year"
              value={form.endYear || ""}
              onChange={set("endYear")}
              placeholder="2022"
            />
            <Input
              label="Grade / GPA"
              value={form.grade || ""}
              onChange={set("grade")}
              placeholder="Distinction"
            />
          </div>
        </Modal>
      )}

      {/* Add Certification Modal */}
      {modal === "cert" && (
        <Modal
          title="Add Certification"
          onClose={closeModal}
          onSave={handleModalSave}
          saving={addCertMutation.isPending}
        >
          <Input
            label="Certification Name"
            value={form.name || ""}
            onChange={set("name")}
            placeholder="e.g. AWS Certified Developer"
          />
          <Input
            label="Issuing Organization"
            value={form.issuer || ""}
            onChange={set("issuer")}
            placeholder="e.g. Amazon Web Services"
          />
          <Input
            label="Year"
            value={form.year || ""}
            onChange={set("year")}
            placeholder="2023"
          />
        </Modal>
      )}
    </div>
  );
}
