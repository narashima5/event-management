import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Program, Registration, Score, ScoringCriterion } from '../../types';
import { Badge } from '../../components/Badge';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeft,
  Award,
  Lock,
  Save,
  Send,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Users,
} from 'lucide-react';

interface EvaluationItem {
  registration: Registration;
  evaluationStatus: string;
  score: Score | null;
}

export const JuryEvaluationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Form states for the selected participant
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const fetchProgramAndEvaluations = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setUnauthorized(false);

      const progData = await api.getProgram(id);
      setProgram(progData);

      // Fetch jury evaluations for this program
      const evalData = await api.getJuryEvaluations(id);
      setEvaluations(evalData.evaluations || []);

      if (evalData.evaluations && evalData.evaluations.length > 0) {
        // Default select the first participant or keep current
        setSelectedRegId((prev) => prev || evalData.evaluations[0].registration.id);
      }
    } catch (err: any) {
      if (err.status === 403) {
        setUnauthorized(true);
      } else {
        toast.error(`Failed to load evaluation panel: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramAndEvaluations();
  }, [id]);

  // When selected participant changes, populate scores and feedback
  useEffect(() => {
    if (!selectedRegId) return;
    const item = evaluations.find((e) => e.registration.id === selectedRegId);
    if (item && item.score) {
      setCriteriaScores(item.score.criteriaScores || {});
      setFeedback(item.score.feedback || '');
    } else {
      // Initialize with 0s for each criterion
      const initial: Record<string, number> = {};
      program?.scoringConfig?.criteria?.forEach((c) => {
        initial[c.id] = 0;
      });
      setCriteriaScores(initial);
      setFeedback('');
    }
  }, [selectedRegId, evaluations, program]);

  const activeItem = evaluations.find((e) => e.registration.id === selectedRegId);
  const isLocked = activeItem?.evaluationStatus === 'SUBMITTED';

  // Calculate total score
  const totalScore = Object.values(criteriaScores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const maxPossible = program?.scoringConfig?.criteria?.reduce((sum, c) => sum + c.maxScore, 0) || 100;
  const scorePercent = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

  const handleScoreChange = (criterionId: string, value: number, maxScore: number) => {
    if (isLocked) return;
    const clamped = Math.max(0, Math.min(maxScore, value));
    setCriteriaScores((prev) => ({
      ...prev,
      [criterionId]: clamped,
    }));
  };

  const handleSaveDraft = async () => {
    if (!id || !selectedRegId) return;
    try {
      setSubmitting(true);
      const updatedScore = await api.saveOrSubmitScore(id, selectedRegId, {
        criteriaScores,
        feedback,
        isFinalSubmit: false,
      });

      toast.success('Evaluation draft saved successfully');
      setEvaluations((prev) =>
        prev.map((e) =>
          e.registration.id === selectedRegId
            ? { ...e, evaluationStatus: 'DRAFT', score: updatedScore }
            : e
        )
      );
    } catch (err: any) {
      toast.error(`Failed to save score draft: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!id || !selectedRegId) return;
    try {
      setSubmitting(true);
      const updatedScore = await api.saveOrSubmitScore(id, selectedRegId, {
        criteriaScores,
        feedback,
        isFinalSubmit: true,
      });

      toast.success('Score submitted & locked officially!');
      setEvaluations((prev) =>
        prev.map((e) =>
          e.registration.id === selectedRegId
            ? { ...e, evaluationStatus: 'SUBMITTED', score: updatedScore }
            : e
        )
      );
      setConfirmSubmitOpen(false);
    } catch (err: any) {
      toast.error(`Failed to submit score: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (unauthorized) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--rose)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Restricted Evaluation Arena</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
          Jury Isolation Boundary: You are not empaneled as a judge for this competition. You may only evaluate scores for competitions assigned to your jury credential.
        </p>
        <button onClick={() => navigate('/jury/dashboard')} className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Jury Arena
        </button>
      </div>
    );
  }

  const criteriaList = program?.scoringConfig?.criteria || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => navigate('/jury/dashboard')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Assigned Programs
        </button>

        {program && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Judging Program:</span>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>{program.name}</strong>
            <code style={{ fontSize: '0.75rem', color: 'var(--amber)' }}>{program.code}</code>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonCard />
      ) : evaluations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No registered participants to evaluate"
          description="There are currently no confirmed participants registered for this program. Once registrations are received, they will appear here for scoring."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Participant Line-up */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--amber)" /> Participant Line-up
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {evaluations.filter((e) => e.evaluationStatus === 'SUBMITTED').length} of {evaluations.length} evaluated
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {evaluations.map((item) => {
                const isSelected = item.registration.id === selectedRegId;
                const reg = item.registration;
                const isTeam = reg.participantType === 'TEAM' || Boolean(reg.teamName);
                const name = isTeam
                  ? (reg.teamName || reg.participantData?.teamName || 'Team')
                  : (reg.participantData?.name || reg.participantData?.fullName || reg.teamName || 'Unknown');
                const dept = reg.department || reg.participantData?.department || 'N/A';

                return (
                  <div
                    key={reg.id}
                    onClick={() => setSelectedRegId(reg.id)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--amber)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <code style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--amber)' : 'var(--text-muted)' }}>
                        {reg.registrationNumber}
                      </code>
                      {item.evaluationStatus === 'SUBMITTED' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: 'var(--emerald)', fontWeight: 700 }}>
                          <Lock size={11} /> Locked
                        </span>
                      ) : item.evaluationStatus === 'DRAFT' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: 'var(--amber)', fontWeight: 700 }}>
                          <Clock size={11} /> Draft
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>Pending</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'white' : 'var(--text-main)' }}>
                      {name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <span>{dept}</span>
                      {item.score && (
                        <span style={{ fontWeight: 700, color: isSelected ? 'var(--amber)' : 'var(--text-muted)' }}>
                          {item.score.totalScore.toFixed(1)} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Score Sheet Form */}
          {activeItem && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Participant Info Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <code style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--amber)' }}>
                      {activeItem.registration.registrationNumber}
                    </code>
                    {isLocked ? (
                      <span className="badge badge-success" style={{ gap: '4px' }}>
                        <Lock size={12} /> Officially Locked
                      </span>
                    ) : activeItem.evaluationStatus === 'DRAFT' ? (
                      <span className="badge badge-warning" style={{ gap: '4px' }}>
                        <Clock size={12} /> Unsubmitted Draft
                      </span>
                    ) : (
                      <span className="badge badge-default">Ready for Scoring</span>
                    )}
                  </div>
                  {(() => {
                    const r = activeItem.registration;
                    const isTeamReg = r.participantType === 'TEAM' || Boolean(r.teamName);
                    const titleName = isTeamReg
                      ? (r.teamName || r.participantData?.teamName || 'Team')
                      : (r.participantData?.name || r.participantData?.fullName || r.teamName || 'Participant');
                    const deptName = r.department || r.participantData?.department || 'N/A';
                    const members = r.teamMembers || r.participantData?.teamMembers;

                    return (
                      <>
                        <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>
                          {titleName}
                        </h2>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                          Department: <strong>{deptName}</strong>
                          {isTeamReg && members && members.length > 0 && (
                            <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                              Members: {members.map((m: any) => `${m.name || m}${m.registerNumber ? ` (${m.registerNumber})` : ''}`).join(', ')}
                            </div>
                          )}
                          {!isTeamReg && r.participantData?.registerNumber && ` • Reg: ${r.participantData.registerNumber}`}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Score Summary Box */}
                <div
                  style={{
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    textAlign: 'center',
                    minWidth: '140px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' }}>
                    Calculated Score
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
                    {totalScore.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    out of {maxPossible} pts ({Math.round(scorePercent)}%)
                  </div>
                </div>
              </div>

              {/* Locked Warning Alert */}
              {isLocked && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--emerald)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Official Final Score Recorded:</strong> Your evaluation for this participant has been locked and sealed. If a correction is urgently required, contact an Administrator to unlock the score record.
                  </div>
                </div>
              )}

              {/* Scoring Criteria Inputs */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--amber)" /> Rubric Evaluation Dimensions
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {criteriaList.map((crit) => {
                    const currentVal = criteriaScores[crit.id] ?? 0;

                    return (
                      <div
                        key={crit.id}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                              {crit.name}
                            </div>
                            {crit.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {crit.description}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Max: <strong>{crit.maxScore}</strong> pts
                            </span>
                          </div>
                        </div>

                        {/* Slider + Number Input Combo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <input
                            type="range"
                            min="0"
                            max={crit.maxScore}
                            step="0.5"
                            value={currentVal}
                            disabled={isLocked}
                            onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0, crit.maxScore)}
                            style={{
                              flex: 1,
                              accentColor: 'var(--amber)',
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                            }}
                          />
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            max={crit.maxScore}
                            step="0.5"
                            value={currentVal}
                            disabled={isLocked}
                            onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0, crit.maxScore)}
                            style={{
                              width: '80px',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedback / Qualitative Remarks */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Jury Remarks & Operational Feedback (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Notes on performance nuances, costume execution, presentation quality..."
                  value={feedback}
                  disabled={isLocked}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              {/* Actions Footer */}
              {!isLocked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <button
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="btn btn-secondary"
                  >
                    <Save size={16} /> Save Draft
                  </button>
                  <button
                    onClick={() => setConfirmSubmitOpen(true)}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#090a10' }}
                  >
                    <Send size={16} /> Submit & Lock Final Score
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Locking Score */}
      <ConfirmDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Lock & Submit Official Evaluation?"
        message={`Are you sure you want to finalize this score (${totalScore.toFixed(1)} / ${maxPossible} pts) for ${
          activeItem?.registration?.teamName || activeItem?.registration?.participantData?.name || activeItem?.registration?.registrationNumber
        }? Once submitted, this score is permanently locked to prevent tampering unless unlocked by an Administrator.`}
        confirmLabel="Confirm & Lock Score"
        isDestructive={false}
      />
    </div>
  );
};
