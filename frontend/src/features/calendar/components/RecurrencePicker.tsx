import { useFormContext } from 'react-hook-form';

const RecurrencePicker = () => {
    const { register } = useFormContext();

    return (
        <div className="space-y-2">
            <div>
                <label htmlFor="freq">Frequency:</label>
                <select id="freq" {...register('recurrence.freq')}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                </select>
            </div>
            <div>
                <label htmlFor="interval">Interval:</label>
                <input id="interval" type="number" {...register('recurrence.interval')} />
            </div>
            <div>
                <label htmlFor="until">Until:</label>
                <input id="until" type="date" {...register('recurrence.until')} />
            </div>
        </div>
    );
};

export default RecurrencePicker;
