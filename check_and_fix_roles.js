const pool = require('./src/config/db');

async function fixRoles() {
    try {
        const usersToCheck = [
            { email: 'learnify887@gmail.com', desiredRole: 'admin' },
            { email: 'shashwatdixit22@gmail.com', desiredRole: 'user' }
        ];

        for (const user of usersToCheck) {
            const res = await pool.query('SELECT email, role FROM users WHERE email = $1', [user.email]);
            if (res.rows.length > 0) {
                const currentRole = res.rows[0].role;
                console.log(`User ${user.email} found with role: ${currentRole}`);

                if (currentRole !== user.desiredRole) {
                    console.log(`Updating ${user.email} to role: ${user.desiredRole}...`);
                    await pool.query('UPDATE users SET role = $1 WHERE email = $2', [user.desiredRole, user.email]);
                    console.log('Update successful.');
                } else {
                    console.log(`Role is already correct.`);
                }
            } else {
                console.log(`User ${user.email} NOT FOUND in database.`);
            }
        }
    } catch (err) {
        console.error('Error fixing roles:', err);
    } finally {
        await pool.end();
    }
}

fixRoles();
