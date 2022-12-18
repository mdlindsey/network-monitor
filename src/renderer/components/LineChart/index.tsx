import { CSSProperties } from 'react'
import { Chart } from 'react-charts'

type Label = string | number | Date

const LineChart = ({ values, labels=[], style }:{ values: number[], labels?: Label[], style?: CSSProperties }) => {
    if (!values?.length) {
        return null
    }
    return (
        <div style={{ width: 600, height: 400, ...(style||{}), position: 'relative' }}>
            <Chart
                options={{
                    primaryAxis: { getValue: d => d.primary, elementType: 'line' },
                    secondaryAxes: [{ getValue: d => d.secondary, elementType: 'line' }],
                    data: [{
                        data: values.map((v,i) => ({
                            primary: labels[i] === labels[i-1] ? '' : labels[i] || i,
                            secondary: v,
                        }))
                    }]
                }}
            />
        </div>
    )
}

export default LineChart
