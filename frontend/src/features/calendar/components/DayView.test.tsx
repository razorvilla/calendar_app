import { render, screen } from '@testing-library/react';
import DayView from './DayView';
import { CalendarProvider } from '../context/CalendarContext';

describe('DayView', () => {
  it('renders the current date', () => {
    render(
      <CalendarProvider>
        <DayView />
      </CalendarProvider>
    );
    const currentDate = new Date();
    expect(screen.getByText(`Current Date: ${currentDate.toDateString()}`)).toBeInTheDocument();
  });
});
