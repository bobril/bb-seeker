using System;

using NUnit.Framework;
using System.Drawing;
using OpenQA.Selenium;
using NUnit.Framework.Internal;

namespace BBSeeker.Tests
{

    public class TestBase
    {
        protected IWebDriver Driver
        {
            get { return TestExecutionContext.CurrentContext.CurrentTest.Properties.Get(WebDriverExtensionsCustom.DriverKey) as IWebDriver; }
            set { TestExecutionContext.CurrentContext.CurrentTest.Properties.Set(WebDriverExtensionsCustom.DriverKey, value); }
        }

        protected uint WaitTime = 2;

        protected const string NotImplementedYet = "Not implemented yet";

        [SetUp]
        public void SetUp()
        {
            DriverInit();
        }

        [TearDown]
        public void CleanUp()
        {
            Dispose();
        }

        protected IWebDriver DriverInit()
        {
            Driver = WebDriverExtensionsCustom.InitDriver("chrome");
            Driver.Manage().Window.Position = new Point(0, 0);
            Driver.Manage().Window.Size = new Size(1920, 1080);

            Driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(WaitTime);
            Driver.SetAsyncScriptTimeout(WaitTime);
            return Driver;
        }

        /// <summary>
        /// Close all browser windows and destroy driver.
        /// </summary>
        protected void Dispose()
        {
            if (Driver != null)
            {
                Driver.Quit();
            }
        }

    }
}
