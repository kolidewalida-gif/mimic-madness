import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MimicMasterButton, MimicMasterRecap, type MimicMasterButtonProps } from './MimicMaster';

afterEach(cleanup);
const props: MimicMasterButtonProps = { availability: 'available', status: 'ready', pending: false,
  targetName: 'Luna', onChoose: vi.fn(), onRetry: vi.fn() };

describe('Bubble Mimic Master', () => {
  it('has just one control and awards the crown directly', () => {
    const choose = vi.fn();
    render(<MimicMasterButton {...props} onChoose={choose} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('heading')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Décerner mon Mimic Master à Luna' }));
    expect(choose).toHaveBeenCalledTimes(1);
  });
  it('marks the current favorite as selected and locks it', () => {
    const choose = vi.fn();
    render(<MimicMasterButton {...props} availability="selected" onChoose={choose} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(choose).not.toHaveBeenCalled();
  });
  it('shows saved choices without exposing another select action', () => {
    render(<MimicMasterButton {...props} availability="used" chosenName="Alex" />);
    expect(screen.getByRole('status')).toHaveTextContent('Ton Mimic Master : Alex. Choix définitif.');
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent('0');
  });
  it('prevents an award for an own duo and during writes', () => {
    const view = render(<MimicMasterButton {...props} teamMode availability="own" />);
    expect(screen.getByRole('status')).toHaveTextContent('un duo adverse');
    expect(screen.getByRole('button')).toBeDisabled();
    view.rerender(<MimicMasterButton {...props} pending />);
    expect(screen.getByRole('status')).toHaveTextContent('On enregistre');
    expect(screen.getByRole('button')).toBeDisabled();
    view.rerender(<MimicMasterButton {...props} availability="no-audio" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('never pretends the mechanic is active when the migration is missing', () => {
    render(<MimicMasterButton {...props} status="unavailable" />);
    expect(screen.getByRole('status')).toHaveTextContent('ne sont pas encore activés');
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('offers recovery after a network failure', () => {
    const retry = vi.fn();
    render(<MimicMasterButton {...props} status="error" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer la connexion Mimic Master' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('explains bonus losses and team scoring without claiming a guaranteed win', () => {
    render(<MimicMasterButton {...props} teamMode />);
    const button = screen.getByRole('button');
    expect(button.title).toContain('Choix définitif');
    expect(button.title).toContain('bonus négatif possible');
    expect(button.title).toContain('au duo favori');
    expect(button.title).toContain('Un seul par joueur et par manche');
    expect(screen.queryByText('Comment fonctionnent les bonus ?')).toBeNull();
  });
  it('shows included score breakdowns including a negative flair bonus', () => {
    render(<MimicMasterRecap labels={{ a: 'Alex' }} scores={[{ key: 'a', baseScore: 2, masterCount: 1, predictionBonus: -.5, score: 2.5 }]} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('-0,5')).toBeInTheDocument();
    expect(screen.getByText('+2,5')).toBeInTheDocument();
    expect(screen.getByText('Ces bonus sont déjà inclus dans le classement.')).toBeInTheDocument();
  });
});
